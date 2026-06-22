import { FastifyPluginAsync } from 'fastify'
import { CreateAppointmentSchema, UpdateAppointmentStatusSchema } from '@cms/shared'
import { supabase } from '../plugins/supabase'
import { getQueueDate } from '../lib/date'

const appointmentRoutes: FastifyPluginAsync = async (fastify) => {
  const clinicId = process.env.CLINIC_ID!

  fastify.get('/appointments', {
    preHandler: [(fastify as any).authenticate],
  }, async (request) => {
    const user = (request as any).user
    const { doctorId, date, startDate, endDate } = request.query as any

    let q = supabase.from('Appointment').select('*, token:Token(tokenNumber)').eq('clinicId', clinicId)
    if (user.role === 'Patient') q = q.eq('patientId', user.sub)
    if (user.role === 'Doctor') q = q.eq('doctorId', user.sub)
    if (doctorId) q = q.eq('doctorId', doctorId)
    if (date) {
      const d = new Date(date); d.setHours(0, 0, 0, 0)
      const next = new Date(d); next.setDate(next.getDate() + 1)
      q = q.gte('slotStart', d.toISOString()).lt('slotStart', next.toISOString())
    }
    if (startDate && endDate) q = q.gte('slotStart', startDate).lt('slotStart', endDate)
    const { data: appointments } = await q.order('slotStart')

    const patientIds = [...new Set((appointments ?? []).map((a: any) => a.patientId))]
    const doctorIds2 = [...new Set((appointments ?? []).map((a: any) => a.doctorId))]

    const [{ data: patients }, { data: doctors }] = await Promise.all([
      supabase.from('Patient').select('id, fullName').in('id', patientIds.length ? patientIds : ['_']),
      supabase.from('Doctor').select('id, fullName').in('id', doctorIds2.length ? doctorIds2 : ['_']),
    ])

    const pMap = new Map((patients ?? []).map((p: any) => [p.id, p.fullName]))
    const dMap = new Map((doctors ?? []).map((d: any) => [d.id, d.fullName]))

    return (appointments ?? []).map((a: any) => ({
      ...a,
      patientName: pMap.get(a.patientId),
      doctorName: dMap.get(a.doctorId),
      tokenNumber: a.token?.tokenNumber,
    }))
  })

  fastify.get('/appointments/booked', async (request, reply) => {
    const { doctorId, date } = request.query as any
    if (!doctorId || !date) return reply.code(400).send({ error: 'doctorId and date are required' })

    const d = new Date(date); d.setHours(0, 0, 0, 0)
    const next = new Date(d); next.setDate(next.getDate() + 1)

    const { data } = await supabase.from('Appointment')
      .select('slotStart, slotEnd')
      .eq('doctorId', doctorId)
      .gte('slotStart', d.toISOString())
      .lt('slotStart', next.toISOString())
      .neq('status', 'Cancelled')
    return data ?? []
  })

  fastify.post('/appointments', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Patient'])],
  }, async (request, reply) => {
    const user = (request as any).user
    const body = CreateAppointmentSchema.parse(request.body)

    const { data: existing } = await supabase.from('Appointment')
      .select('id').eq('doctorId', body.doctorId).eq('slotStart', body.slotStart).neq('status', 'Cancelled').single()
    if (existing) return reply.code(409).send({ error: 'Slot already booked' })

    const { data: appointment, error } = await supabase.from('Appointment').insert({
      clinicId, patientId: user.sub, doctorId: body.doctorId,
      slotStart: body.slotStart, slotEnd: body.slotEnd, source: 'Online',
    }).select().single()
    if (error) {
      // The (clinicId, doctorId, slotStart) unique constraint atomically prevents
      // double-booking. If two patients race for the same slot, the loser lands here
      // with Postgres unique_violation (23505) — return a clean 409, not a 500.
      if (error.code === '23505') return reply.code(409).send({ error: 'Slot already booked' })
      return reply.code(500).send({ error: error.message })
    }

    // Assign token
    const todayDate = getQueueDate()
    const { data: seq } = await supabase.from('TokenSequence')
      .select('lastToken').eq('clinicId', clinicId).eq('queueDate', todayDate).single()
    const nextToken = (seq?.lastToken ?? 0) + 1
    await supabase.from('TokenSequence').upsert({ clinicId, queueDate: todayDate, lastToken: nextToken })
    await supabase.from('Token').insert({
      clinicId, appointmentId: appointment.id, patientId: user.sub,
      tokenNumber: nextToken, queueDate: todayDate, source: 'Online',
    })

    return reply.code(201).send({ ...appointment, tokenNumber: nextToken })
  })

  fastify.patch('/appointments/:id/status', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Receptionist', 'Doctor'])],
  }, async (request) => {
    const { id } = request.params as any
    const body = UpdateAppointmentStatusSchema.parse(request.body)
    const { data } = await supabase.from('Appointment').update({ status: body.status }).eq('id', id).select().single()
    return data
  })
}

export default appointmentRoutes
