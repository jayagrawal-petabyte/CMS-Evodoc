import { FastifyPluginAsync } from 'fastify'
import { supabase } from '../plugins/supabase'
import { storageService } from '../services/storage.service'

// Private bucket for clinical visit attachments (PHI) — served via signed URLs only.
const ATTACHMENT_BUCKET = 'visit-files'

const visitRoutes: FastifyPluginAsync = async (fastify) => {
  const clinicId = process.env.CLINIC_ID!

  fastify.get('/visits', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Doctor'])],
  }, async (request) => {
    const user = (request as any).user
    const today = new Date(); today.setHours(0, 0, 0, 0)

    const { data: visits } = await supabase.from('Visit').select('*, appointment:Appointment(*, token:Token(tokenNumber))')
      .eq('clinicId', clinicId).eq('doctorId', user.sub).gte('createdAt', today.toISOString()).order('createdAt')

    const patientIds = [...new Set((visits ?? []).map((v: any) => v.patientId))]
    const { data: patients } = await supabase.from('Patient')
      .select('id, fullName, phone, dateOfBirth, gender, bloodGroup')
      .in('id', patientIds.length ? patientIds : ['_'])
    const pMap = new Map((patients ?? []).map((p: any) => [p.id, p]))

    return (visits ?? []).map((v: any) => ({ ...v, patient: pMap.get(v.patientId) }))
  })

  fastify.get('/visits/:id', {
    preHandler: [(fastify as any).authenticate],
  }, async (request, reply) => {
    const { id } = request.params as any
    const user = (request as any).user
    const { data: visit } = await supabase.from('Visit')
      .select('*, appointment:Appointment(*, token:Token(*)), prescriptionDraft:PrescriptionDraft(*), prescription:Prescription(*)')
      .eq('id', id).eq('clinicId', clinicId).single()
    if (!visit) return reply.code(404).send({ error: 'Visit not found' })

    // Access control: a patient may only read their own visit. Clinical staff
    // (Doctor / Receptionist) of this clinic may read any visit in the clinic.
    if (user.role === 'Patient' && visit.patientId !== user.sub) {
      return reply.code(403).send({ error: 'Forbidden' })
    }

    const { data: patient } = await supabase.from('Patient')
      .select('id, fullName, phone, dateOfBirth, gender, bloodGroup').eq('id', visit.patientId).single()

    // Supabase returns embedded relations without a unique constraint as arrays.
    // Normalize the to-one relations the frontend expects to single objects.
    const first = (v: any) => Array.isArray(v) ? (v[0] ?? null) : (v ?? null)
    const appointment = first(visit.appointment)
    if (appointment) appointment.token = first(appointment.token)
    const draft = first(visit.prescriptionDraft)
    const prescription = first(visit.prescription)

    // Merge emrData back into prescriptionDraft for the frontend
    const emrData = draft?.emrData ?? {}
    const mergedDraft = draft ? {
      ...draft,
      chiefComplaint: emrData.chiefComplaint ?? '',
      symptoms: emrData.symptoms ?? '',
      vitals: emrData.vitals ?? {},
      investigations: emrData.investigations ?? [],
      advice: emrData.advice ?? '',
      followUpDate: emrData.followUpDate ?? '',
      followUpReason: emrData.followUpReason ?? '',
      clinicalNotes: emrData.clinicalNotes ?? '',
    } : null

    return { ...visit, appointment, patient, prescriptionDraft: mergedDraft, prescription }
  })

  fastify.post('/visits', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Doctor'])],
  }, async (request, reply) => {
    const { appointmentId } = request.body as any
    const user = (request as any).user

    const { data: appt } = await supabase.from('Appointment')
      .select('*, token:Token(id)').eq('id', appointmentId).single()
    if (!appt) return reply.code(404).send({ error: 'Appointment not found' })

    const { data: existing } = await supabase.from('Visit').select('*').eq('appointmentId', appointmentId).single()
    if (existing) return existing

    const { data: visit, error } = await supabase.from('Visit').insert({
      clinicId, appointmentId,
      patientId: appt.patientId, doctorId: user.sub,
      tokenId: appt.token?.id, status: 'Open',
    }).select().single()
    if (error) return reply.code(500).send({ error: error.message })

    await supabase.from('Appointment').update({ status: 'Arrived' }).eq('id', appointmentId)
    return reply.code(201).send(visit)
  })

  fastify.get('/visits/:id/attachments', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Doctor', 'Receptionist'])],
  }, async (request) => {
    const { id } = request.params as any
    const { data } = await supabase.from('VisitAttachment')
      .select('*').eq('visitId', id).eq('clinicId', clinicId).order('uploadedAt', { ascending: false })
    // Private bucket — hand out short-lived signed URLs, not public links.
    return Promise.all((data ?? []).map(async (a: any) => ({
      ...a,
      url: await storageService.getSignedUrl(ATTACHMENT_BUCKET, a.blobPath, 900),
    })))
  })

  fastify.post('/visits/attachments', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Doctor'])],
  }, async (request, reply) => {
    const user = (request as any).user
    const file = await (request as any).file()
    if (!file) return reply.code(400).send({ error: 'No file' })

    // In streaming multipart mode request.body is undefined; the non-file fields
    // travel on file.fields instead.
    const visitId = (file.fields?.visitId as any)?.value
    const patientId = (file.fields?.patientId as any)?.value
    if (!visitId) return reply.code(400).send({ error: 'visitId is required' })
    const ext = file.filename.split('.').pop() ?? 'bin'
    const blobPath = `${clinicId}/visits/${visitId}/${Date.now()}.${ext}`
    const buffer = await file.toBuffer()
    await storageService.upload(ATTACHMENT_BUCKET, blobPath, buffer, file.mimetype)

    const { data, error } = await supabase.from('VisitAttachment').insert({
      clinicId, visitId, patientId,
      filename: file.filename,
      mimeType: file.mimetype,
      size: buffer.length,
      blobPath,
      uploadedBy: user.sub,
    }).select().single()
    if (error) return reply.code(500).send({ error: error.message })

    return reply.code(201).send({
      ...data,
      url: await storageService.getSignedUrl(ATTACHMENT_BUCKET, blobPath, 900),
    })
  })

  fastify.delete('/visits/attachments/:id', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Doctor'])],
  }, async (request, reply) => {
    const { id } = request.params as any
    const { data: attachment } = await supabase.from('VisitAttachment').select('blobPath').eq('id', id).eq('clinicId', clinicId).single()
    if (attachment?.blobPath) {
      await storageService.delete(ATTACHMENT_BUCKET, attachment.blobPath).catch(() => {})
    }
    await supabase.from('VisitAttachment').delete().eq('id', id).eq('clinicId', clinicId)
    return reply.code(204).send()
  })

  fastify.get('/visits/:id/history', {
    preHandler: [(fastify as any).authenticate],
  }, async (request, reply) => {
    const { id } = request.params as any
    const user = (request as any).user
    const { data: visit } = await supabase.from('Visit').select('patientId').eq('id', id).eq('clinicId', clinicId).single()
    if (!visit) return reply.code(404).send({ error: 'Visit not found' })
    // A patient may only view history for their own visit.
    if (user.role === 'Patient' && visit.patientId !== user.sub) {
      return reply.code(403).send({ error: 'Forbidden' })
    }

    const { data: pastVisits } = await supabase.from('Visit')
      .select('*, prescription:Prescription(*), appointment:Appointment(*)')
      .eq('patientId', visit.patientId).eq('status', 'Completed').neq('id', id)
      .order('createdAt', { ascending: false }).limit(20)

    const doctorIds = [...new Set((pastVisits ?? []).map((v: any) => v.doctorId))]
    const { data: doctors } = await supabase.from('Doctor').select('id, fullName').in('id', doctorIds.length ? doctorIds : ['_'])
    const dMap = new Map((doctors ?? []).map((d: any) => [d.id, d.fullName]))

    return (pastVisits ?? []).map((v: any) => ({
      id: v.id, createdAt: v.createdAt,
      doctorName: dMap.get(v.doctorId),
      diagnosis: v.prescription?.diagnosis ?? null,
      drugs: v.prescription?.drugs ?? [],
      hasPrescription: !!v.prescription,
    }))
  })

}

export default visitRoutes
