import { FastifyPluginAsync } from 'fastify'
import { WalkInTokenSchema } from '@cms/shared'
import { supabase } from '../plugins/supabase'
import { getQueueDate } from '../lib/date'
import bcrypt from 'bcrypt'

const tokenRoutes: FastifyPluginAsync = async (fastify) => {
  const clinicId = process.env.CLINIC_ID!

  fastify.get('/tokens/today', {
    preHandler: [(fastify as any).authenticate],
  }, async (request) => {
    const user = (request as any).user
    const today = getQueueDate()
    let q = supabase.from('Token').select('*, appointment:Appointment(doctorId, slotStart, source)')
      .eq('clinicId', clinicId).eq('queueDate', today)
    if (user.role === 'Doctor') q = q.eq('appointment.doctorId', user.sub)
    const { data: tokens } = await q.order('tokenNumber')
    if (!tokens?.length) return []

    const patientIds = [...new Set(tokens.map((t: any) => t.patientId))]
    const { data: patients } = await supabase.from('Patient')
      .select('id, fullName, phone, dateOfBirth, gender, bloodGroup')
      .in('id', patientIds)

    const { data: visits } = await supabase.from('Visit')
      .select('id, tokenId, status, createdAt')
      .in('tokenId', tokens.map((t: any) => t.id))

    const pMap = new Map((patients ?? []).map((p: any) => [p.id, p]))
    const vMap = new Map((visits ?? []).map((v: any) => [v.tokenId, v]))

    return tokens.map((t: any) => ({
      ...t,
      patient: pMap.get(t.patientId),
      visit: vMap.get(t.id) ?? null,
    }))
  })

  fastify.get('/tokens/queue', {
    preHandler: [(fastify as any).authenticate],
  }, async () => {
    const today = getQueueDate()
    // Return all live (non-terminal) tokens so the reception panel sees Arrived/On-Hold/
    // Skipped patients too — not just Waiting/Called. Completed & Abandoned are terminal.
    const { data: tokens } = await supabase.from('Token')
      .select('*, appointment:Appointment(doctorId, source)')
      .eq('clinicId', clinicId).eq('queueDate', today)
      .in('status', ['Waiting', 'Arrived', 'Called', 'OnHold', 'Skipped']).order('tokenNumber')
    if (!tokens?.length) return []

    const patientIds = [...new Set(tokens.map((t: any) => t.patientId))]
    const doctorIds = [...new Set(tokens.map((t: any) => t.appointment?.doctorId).filter(Boolean))]
    const [{ data: patients }, { data: doctors }] = await Promise.all([
      supabase.from('Patient').select('id, fullName, phone').in('id', patientIds.length ? patientIds : ['_']),
      supabase.from('Doctor').select('id, fullName').in('id', doctorIds.length ? doctorIds : ['_']),
    ])
    const pMap = new Map((patients ?? []).map((p: any) => [p.id, p]))
    const dMap = new Map((doctors ?? []).map((d: any) => [d.id, d.fullName]))

    const drName = (n?: string) => (n ? (/^dr\.?\s/i.test(n) ? n : `Dr. ${n}`) : 'Doctor')
    return tokens.map((t: any) => ({
      ...t,
      patientName: pMap.get(t.patientId)?.fullName ?? 'Patient',
      patientPhone: pMap.get(t.patientId)?.phone ?? '',
      doctorId: t.appointment?.doctorId ?? null,
      doctorName: drName(dMap.get(t.appointment?.doctorId)),
      source: t.appointment?.source ?? t.source,
    }))
  })

  // Reception "Finish" — mark a called patient's token complete (no prescription required).
  fastify.post('/tokens/:id/complete', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Receptionist'])],
  }, async (request) => {
    const { id } = request.params as any
    await supabase.from('Token').update({ status: 'Completed', completedAt: new Date().toISOString() }).eq('id', id)
    return { ok: true }
  })

  fastify.get('/tokens/my-today', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Patient'])],
  }, async (request, reply) => {
    const user = (request as any).user
    const today = getQueueDate()

    const { data: token } = await supabase.from('Token')
      .select('*').eq('patientId', user.sub).eq('queueDate', today).single()
    if (!token) return reply.code(404).send({ error: 'No token for today' })

    const { count } = await supabase.from('Token')
      .select('id', { count: 'exact', head: true })
      .eq('queueDate', today)
      .lt('tokenNumber', token.tokenNumber)
      .in('status', ['Waiting', 'Called'])

    return { ...token, tokensAhead: count ?? 0 }
  })

  fastify.post('/tokens/next', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Receptionist'])],
  }, async (request, reply) => {
    const today = getQueueDate()
    const { data: current } = await supabase.from('Token')
      .select('*').eq('clinicId', clinicId).eq('queueDate', today).eq('status', 'Called').single()
    if (current) {
      await supabase.from('Token').update({ status: 'Completed', completedAt: new Date().toISOString() }).eq('id', current.id)
    }
    // Call the next present/waiting patient (Arrived patients are prioritised first,
    // then Waiting). On-Hold, Skipped and Abandoned tokens are never auto-called.
    const { data: candidates } = await supabase.from('Token')
      .select('*').eq('clinicId', clinicId).eq('queueDate', today)
      .in('status', ['Arrived', 'Waiting']).order('tokenNumber')
    const next = (candidates ?? []).sort((a: any, b: any) => {
      const rank = (s: string) => (s === 'Arrived' ? 0 : 1)
      return rank(a.status) - rank(b.status) || a.tokenNumber - b.tokenNumber
    })[0]
    if (!next) return reply.code(404).send({ error: 'Queue is empty' })
    await supabase.from('Token').update({ status: 'Called', calledAt: new Date().toISOString() }).eq('id', next.id)
    return { ...next, status: 'Called' }
  })

  // Mark a waiting patient as physically present at reception (pre-exam).
  fastify.post('/tokens/:id/arrive', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Receptionist'])],
  }, async (request) => {
    const { id } = request.params as any
    await supabase.from('Token').update({ status: 'Arrived' }).eq('id', id)
    return { ok: true }
  })

  // Pause a patient who stepped away (e.g. went to the pharmacy/restroom).
  fastify.post('/tokens/:id/hold', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Receptionist'])],
  }, async (request) => {
    const { id } = request.params as any
    await supabase.from('Token').update({ status: 'OnHold' }).eq('id', id)
    return { ok: true }
  })

  // Bring a held/skipped patient back into the waiting line.
  fastify.post('/tokens/:id/resume', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Receptionist'])],
  }, async (request) => {
    const { id } = request.params as any
    await supabase.from('Token').update({ status: 'Waiting' }).eq('id', id)
    return { ok: true }
  })

  // Close out a patient who left without being seen (LWBS) — terminal, kept for analytics.
  fastify.post('/tokens/:id/abandon', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Receptionist'])],
  }, async (request) => {
    const { id } = request.params as any
    await supabase.from('Token').update({ status: 'Abandoned' }).eq('id', id)
    return { ok: true }
  })

  fastify.post('/tokens/:id/skip', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Receptionist'])],
  }, async (request) => {
    const { id } = request.params as any
    await supabase.from('Token').update({ status: 'Skipped' }).eq('id', id)
    return { ok: true }
  })

  fastify.post('/tokens/:id/recall', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Receptionist'])],
  }, async (request) => {
    const { id } = request.params as any
    await supabase.from('Token').update({ status: 'Called', calledAt: new Date().toISOString() }).eq('id', id)
    return { ok: true }
  })

  fastify.post('/tokens/:id/start-visit', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Doctor'])],
  }, async (request, reply) => {
    const { id } = request.params as any
    const user = (request as any).user

    const { data: token } = await supabase.from('Token')
      .select('*, appointment:Appointment(id, patientId, doctorId)').eq('id', id).single()
    if (!token) return reply.code(404).send({ error: 'Token not found' })

    const { data: existing } = await supabase.from('Visit')
      .select('id').eq('tokenId', id).single()
    if (existing) return { visitId: existing.id }

    const { data: visit, error } = await supabase.from('Visit').insert({
      clinicId,
      appointmentId: token.appointment?.id ?? null,
      patientId: token.appointment?.patientId ?? token.patientId,
      doctorId: user.sub,
      tokenId: id,
      status: 'Open',
    }).select().single()
    if (error) return reply.code(500).send({ error: error.message })

    await supabase.from('Appointment').update({ status: 'Arrived' }).eq('id', token.appointment?.id)
    return reply.code(201).send({ visitId: visit.id })
  })

  fastify.post('/tokens/walkin', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Receptionist'])],
  }, async (request, reply) => {
    const body = WalkInTokenSchema.parse(request.body)

    let patient: any = null
    const { data: found } = await supabase.from('Patient').select('*')
      .eq('clinicId', clinicId).eq('phone', body.patientPhone).single()
    patient = found

    let createdNew = false
    if (!patient) {
      if (!body.createPatientIfNotFound) return reply.code(404).send({ error: 'Patient not found.' })
      // Instant account: default login password is the phone number (patient can change it later).
      const passwordHash = await bcrypt.hash(body.patientPhone, 12)
      const { data: created, error: createErr } = await supabase.from('Patient').insert({
        clinicId,
        fullName: body.patientName ?? 'Walk-in Patient',
        phone: body.patientPhone,
        passwordHash,
        dateOfBirth: body.dateOfBirth || null,
        gender: body.gender || null,
        bloodGroup: body.bloodGroup || null,
        address: body.address || null,
      }).select().single()
      if (createErr || !created) {
        return reply.code(500).send({ error: `Failed to create patient: ${createErr?.message ?? 'unknown error'}` })
      }
      patient = created
      createdNew = true
    }

    // Use the current timestamp for the walk-in slot so each walk-in is unique.
    // (Local midnight collided on the (clinicId, doctorId, slotStart) unique key,
    // capping a doctor at one walk-in per day.)
    const now = new Date()
    const slotEnd = new Date(now.getTime() + 30 * 60000)
    const todayDate = getQueueDate()

    const { data: appointment, error: apptError } = await supabase.from('Appointment').insert({
      clinicId, patientId: patient.id, doctorId: body.doctorId,
      slotStart: now.toISOString(), slotEnd: slotEnd.toISOString(),
      source: 'WalkIn', status: 'Arrived',
    }).select().single()
    if (apptError || !appointment) {
      return reply.code(500).send({ error: `Failed to create appointment: ${apptError?.message ?? 'unknown error'}` })
    }

    const { data: seq } = await supabase.from('TokenSequence')
      .select('lastToken').eq('clinicId', clinicId).eq('queueDate', todayDate).single()
    const nextToken = (seq?.lastToken ?? 0) + 1
    await supabase.from('TokenSequence').upsert({ clinicId, queueDate: todayDate, lastToken: nextToken })
    const { error: tokenError } = await supabase.from('Token').insert({
      clinicId, appointmentId: appointment.id, patientId: patient.id,
      tokenNumber: nextToken, queueDate: todayDate, source: 'WalkIn',
      status: 'Arrived', // walk-ins are physically present at reception
    })
    if (tokenError) {
      return reply.code(500).send({ error: `Failed to create token: ${tokenError.message}` })
    }

    return reply.code(201).send({
      tokenNumber: nextToken,
      patient: { id: patient.id, fullName: patient.fullName, phone: patient.phone },
      appointmentId: appointment.id,
      accountCreated: createdNew, // true when a brand-new patient account was created
    })
  })
}

export default tokenRoutes
