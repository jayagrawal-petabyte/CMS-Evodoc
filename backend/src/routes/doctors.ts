import { FastifyPluginAsync } from 'fastify'
import { CreateDoctorSchema, UpdateDoctorSchema, UpdateDoctorScheduleSchema, CreateSpecializationSchema } from '@cms/shared'
import { storageService } from '../services/storage.service'
import { supabase } from '../plugins/supabase'
import bcrypt from 'bcrypt'

const doctorRoutes: FastifyPluginAsync = async (fastify) => {
  const clinicId = process.env.CLINIC_ID!

  fastify.get('/doctors', async (request) => {
    const { active } = request.query as any
    let q = supabase.from('Doctor').select('*, schedules:DoctorSchedule(*)').eq('clinicId', clinicId)
    if (active === 'true') q = q.eq('isActive', true)
    const { data: doctors } = await q

    const { data: specializations } = await supabase.from('Specialization').select('*').eq('clinicId', clinicId)
    const specMap = new Map((specializations ?? []).map((s: any) => [s.id, s.name]))

    return (doctors ?? []).map((d: any) => ({
      ...d,
      specializationName: specMap.get(d.specializationId) ?? '',
      avatarUrl: d.avatarBlobPath ? storageService.getPublicUrl('clinic-assets', d.avatarBlobPath) : null,
      passwordHash: undefined,
    }))
  })

  fastify.get('/doctors/:id', async (request, reply) => {
    const { id } = request.params as any
    const { data: doctor } = await supabase
      .from('Doctor').select('*, schedules:DoctorSchedule(*)').eq('id', id).single()
    if (!doctor) return reply.code(404).send({ error: 'Doctor not found' })

    const { data: spec } = await supabase.from('Specialization').select('name').eq('id', doctor.specializationId).single()
    return {
      ...doctor,
      specializationName: spec?.name ?? '',
      avatarUrl: doctor.avatarBlobPath ? storageService.getPublicUrl('clinic-assets', doctor.avatarBlobPath) : null,
      passwordHash: undefined,
    }
  })

  fastify.post('/doctors', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Receptionist'])],
  }, async (request, reply) => {
    const body = CreateDoctorSchema.parse(request.body)
    const passwordHash = await bcrypt.hash(body.password, 12)
    const { data, error } = await supabase.from('Doctor').insert({
      clinicId,
      fullName: body.fullName,
      phone: body.phone,
      specializationId: body.specializationId,
      qualification: body.qualification ?? null,
      bio: body.bio ?? null,
      isActive: true,
      passwordHash,
    }).select().single()
    if (error) return reply.code(500).send({ error: error.message })
    return reply.code(201).send({ ...data, passwordHash: undefined })
  })

  fastify.put('/doctors/:id', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Receptionist'])],
  }, async (request, reply) => {
    const { id } = request.params as any
    const body = UpdateDoctorSchema.parse(request.body)
    const { data } = await supabase.from('Doctor').update(body).eq('id', id).select().single()
    return { ...data, passwordHash: undefined }
  })

  fastify.put('/doctors/:id/avatar', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Receptionist'])],
  }, async (request, reply) => {
    const { id } = request.params as any
    const file = await (request as any).file()
    if (!file) return reply.code(400).send({ error: 'No file uploaded' })

    const ext = file.filename.split('.').pop() ?? 'jpg'
    const path = `${clinicId}/doctors/${id}.${ext}`
    const buffer = await file.toBuffer()
    await storageService.upload('clinic-assets', path, buffer, file.mimetype)
    await supabase.from('Doctor').update({ avatarBlobPath: path }).eq('id', id)
    return { avatarUrl: storageService.getPublicUrl('clinic-assets', path) }
  })

  fastify.get('/doctors/:id/schedule', async (request) => {
    const { id } = request.params as any
    const { data } = await supabase.from('DoctorSchedule').select('*').eq('doctorId', id)
    return data ?? []
  })

  fastify.put('/doctors/:id/schedule', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Receptionist'])],
  }, async (request, reply) => {
    const { id } = request.params as any
    const body = UpdateDoctorScheduleSchema.parse(request.body)

    await supabase.from('DoctorSchedule').delete().eq('doctorId', id)
    const { data } = await supabase.from('DoctorSchedule').insert(
      body.schedules.map((s: any) => ({ ...s, doctorId: id, clinicId }))
    ).select()
    return { count: data?.length ?? 0 }
  })

  fastify.get('/specializations', async () => {
    const { data } = await supabase.from('Specialization').select('*').eq('clinicId', clinicId).order('name')
    return data ?? []
  })

  fastify.post('/specializations', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Receptionist'])],
  }, async (request, reply) => {
    const body = CreateSpecializationSchema.parse(request.body)
    const { data, error } = await supabase.from('Specialization').insert({ clinicId, name: body.name }).select().single()
    if (error) return reply.code(500).send({ error: error.message })
    return reply.code(201).send(data)
  })
}

export default doctorRoutes
