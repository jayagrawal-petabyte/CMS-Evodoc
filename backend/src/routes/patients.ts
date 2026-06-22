import { FastifyPluginAsync } from 'fastify'
import { AllergySchema, ActiveMedicationSchema, UpdatePatientSchema } from '@cms/shared'
import { supabase } from '../plugins/supabase'
import { sanitizeSearch } from '../lib/sanitize'

const patientRoutes: FastifyPluginAsync = async (fastify) => {
  const clinicId = process.env.CLINIC_ID!

  fastify.get('/patients', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Receptionist', 'Doctor'])],
  }, async (request) => {
    const { search } = request.query as any
    let q = supabase.from('Patient')
      .select('id, fullName, phone, dateOfBirth, gender, bloodGroup, createdAt')
      .eq('clinicId', clinicId)
      .order('createdAt', { ascending: false })
      .limit(100)

    const safe = sanitizeSearch(search)
    if (safe) {
      q = q.or(`fullName.ilike.%${safe}%,phone.ilike.%${safe}%`)
    }

    const { data } = await q
    return data ?? []
  })

  fastify.get('/patients/lookup', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Receptionist'])],
  }, async (request, reply) => {
    const { phone } = request.query as any
    if (!phone) return reply.code(400).send({ error: 'phone is required' })

    const { data } = await supabase.from('Patient')
      .select('id, fullName, phone, dateOfBirth, gender, bloodGroup, createdAt')
      .eq('clinicId', clinicId).eq('phone', phone).single()
    if (!data) return reply.code(404).send({ error: 'Patient not found' })
    return data
  })

  fastify.get('/patients/:id', {
    preHandler: [(fastify as any).authenticate],
  }, async (request, reply) => {
    const { id } = request.params as any
    const user = (request as any).user
    if (user.role === 'Patient' && user.sub !== id) return reply.code(403).send({ error: 'Forbidden' })

    const { data } = await supabase.from('Patient')
      .select('id, fullName, phone, dateOfBirth, gender, bloodGroup, createdAt')
      .eq('id', id).single()
    if (!data) return reply.code(404).send({ error: 'Patient not found' })
    return data
  })

  fastify.put('/patients/:id', {
    preHandler: [(fastify as any).authenticate],
  }, async (request, reply) => {
    const { id } = request.params as any
    const user = (request as any).user
    if (user.role === 'Patient' && user.sub !== id) return reply.code(403).send({ error: 'Forbidden' })

    const body = UpdatePatientSchema.parse(request.body)
    const { data } = await supabase.from('Patient').update(body).eq('id', id)
      .select('id, fullName, phone, dateOfBirth, gender, bloodGroup').single()
    return data
  })

  fastify.get('/patients/:id/allergies', {
    preHandler: [(fastify as any).authenticate],
  }, async (request) => {
    const { id } = request.params as any
    const { data } = await supabase.from('Allergy').select('*').eq('patientId', id).order('recordedAt', { ascending: false })
    return data ?? []
  })

  fastify.post('/patients/:id/allergies', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Doctor', 'Receptionist'])],
  }, async (request, reply) => {
    const { id } = request.params as any
    const body = AllergySchema.parse(request.body)
    const { data, error } = await supabase.from('Allergy').insert({ ...body, patientId: id, clinicId }).select().single()
    if (error) return reply.code(500).send({ error: error.message })
    return reply.code(201).send(data)
  })

  fastify.delete('/patients/:id/allergies/:allergyId', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Doctor'])],
  }, async (request) => {
    const { allergyId } = request.params as any
    await supabase.from('Allergy').delete().eq('id', allergyId)
    return { ok: true }
  })

  fastify.get('/patients/:id/medications', {
    preHandler: [(fastify as any).authenticate],
  }, async (request) => {
    const { id } = request.params as any
    const { data } = await supabase.from('ActiveMedication').select('*').eq('patientId', id).order('startedAt', { ascending: false })
    return data ?? []
  })

  fastify.post('/patients/:id/medications', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Doctor'])],
  }, async (request, reply) => {
    const { id } = request.params as any
    const body = ActiveMedicationSchema.parse(request.body)
    const { data, error } = await supabase.from('ActiveMedication').insert({ ...body, patientId: id, clinicId }).select().single()
    if (error) return reply.code(500).send({ error: error.message })
    return reply.code(201).send(data)
  })

  fastify.delete('/patients/:id/medications/:medId', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Doctor'])],
  }, async (request) => {
    const { medId } = request.params as any
    await supabase.from('ActiveMedication').delete().eq('id', medId)
    return { ok: true }
  })
}

export default patientRoutes
