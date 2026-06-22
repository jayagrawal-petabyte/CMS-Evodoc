import { FastifyPluginAsync } from 'fastify'
import { PrescriptionDraftSchema, FinalizePrescriptionSchema } from '@cms/shared'
import { generatePrescriptionPdf } from '../services/prescription-pdf.service'
import { storageService } from '../services/storage.service'
import { supabase } from '../plugins/supabase'

const prescriptionRoutes: FastifyPluginAsync = async (fastify) => {
  const clinicId = process.env.CLINIC_ID!

  fastify.put('/prescriptions/draft', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Doctor'])],
  }, async (request, reply) => {
    const body = PrescriptionDraftSchema.parse(request.body)
    const { data: existing } = await supabase.from('PrescriptionDraft').select('id').eq('visitId', body.visitId).single()

    const draftPayload: any = {
      diagnosis: body.diagnosis,
      notes: body.notes ?? body.clinicalNotes,
      drugs: body.drugs,
      updatedAt: new Date().toISOString(),
      // Extended EMR fields stored as JSONB metadata
      emrData: {
        chiefComplaint: body.chiefComplaint,
        symptoms: body.symptoms,
        vitals: body.vitals,
        investigations: body.investigations,
        advice: body.advice,
        followUpDate: body.followUpDate,
        followUpReason: body.followUpReason,
        clinicalNotes: body.clinicalNotes,
      },
    }

    if (existing) {
      const { data, error } = await supabase.from('PrescriptionDraft')
        .update(draftPayload)
        .eq('visitId', body.visitId).select().single()
      if (error) return reply.code(500).send({ error: error.message })
      return data
    } else {
      const { data, error } = await supabase.from('PrescriptionDraft').insert({
        clinicId, visitId: body.visitId, ...draftPayload,
      }).select().single()
      if (error) return reply.code(500).send({ error: error.message })
      return data
    }
  })

  fastify.post('/prescriptions/finalize', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Doctor'])],
  }, async (request, reply) => {
    const user = (request as any).user
    const body = FinalizePrescriptionSchema.parse(request.body)

    const { data: draft } = await supabase.from('PrescriptionDraft').select('*').eq('visitId', body.visitId).single()
    if (!draft) return reply.code(404).send({ error: 'Draft not found' })
    if (!draft.diagnosis) return reply.code(400).send({ error: 'Diagnosis is required' })
    const drugs = draft.drugs as any[]
    if (!drugs?.length) return reply.code(400).send({ error: 'At least one drug is required' })

    // Already finalized? (re-finalize attempt) — a Prescription already exists for this visit.
    const { data: existingRx } = await supabase.from('Prescription').select('id').eq('visitId', body.visitId).single()
    if (existingRx) return reply.code(409).send({ error: 'Prescription already finalized for this visit' })

    // Optimistic lock via version check (guards concurrent finalize with a stale version)
    const { data: visitCheck } = await supabase.from('Visit').select('version, status').eq('id', body.visitId).single()
    if (visitCheck?.status === 'Completed') return reply.code(409).send({ error: 'This visit is already completed' })
    if (visitCheck?.version !== body.version) return reply.code(409).send({ error: 'Prescription already finalized in another session' })

    const [{ data: visit }, { data: doctor }, { data: theme }] = await Promise.all([
      supabase.from('Visit').select('patientId, tokenId').eq('id', body.visitId).single(),
      supabase.from('Doctor').select('fullName, qualification').eq('id', user.sub).single(),
      supabase.from('ClinicTheme').select('clinicDisplayName').eq('clinicId', clinicId).single(),
    ])
    const { data: patient } = await supabase.from('Patient')
      .select('fullName, dateOfBirth').eq('id', visit!.patientId).single()

    const patientAge = patient?.dateOfBirth
      ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))
      : undefined

    const pdfBuffer = await generatePrescriptionPdf({
      clinicName: theme?.clinicDisplayName ?? 'Clinic',
      doctorName: doctor?.fullName ?? 'Doctor',
      doctorQualification: doctor?.qualification ?? undefined,
      patientName: patient?.fullName ?? 'Patient',
      patientAge,
      date: new Date().toLocaleDateString('en-IN'),
      diagnosis: draft.diagnosis,
      drugs,
      notes: draft.notes ?? undefined,
    })

    const blobPath = `${clinicId}/${body.visitId}.pdf`
    await storageService.upload('prescriptions', blobPath, pdfBuffer, 'application/pdf')

    const { data: prescription, error: rxError } = await supabase.from('Prescription').insert({
      clinicId, visitId: body.visitId, patientId: visit!.patientId,
      doctorId: user.sub, diagnosis: draft.diagnosis, notes: draft.notes,
      drugs: draft.drugs, blobPath,
    }).select().single()
    if (rxError || !prescription) {
      // Unique (visitId) violation = a concurrent finalize won the race
      if (rxError?.code === '23505') return reply.code(409).send({ error: 'Prescription already finalized for this visit' })
      return reply.code(500).send({ error: `Failed to save prescription: ${rxError?.message ?? 'unknown error'}` })
    }

    // Only now mark the visit complete — so a failed prescription never leaves a
    // Completed visit with no prescription attached.
    await supabase.from('Visit').update({ status: 'Completed', version: body.version + 1 }).eq('id', body.visitId)
    // Complete the token too, so the finished patient leaves the active queue and
    // the consultation can't be reopened as a (read-only) "Resume" from the dashboard.
    if (visit?.tokenId) {
      await supabase.from('Token').update({ status: 'Completed', completedAt: new Date().toISOString() }).eq('id', visit.tokenId)
    }

    const signedUrl = await storageService.getSignedUrl('prescriptions', blobPath, 900)
    return { prescriptionId: prescription.id, signedUrl }
  })

  fastify.get('/prescriptions/:id/download', {
    preHandler: [(fastify as any).authenticate],
  }, async (request, reply) => {
    const user = (request as any).user
    const { id } = request.params as any
    const { data: prescription } = await supabase.from('Prescription').select('*').eq('id', id).eq('clinicId', clinicId).single()
    if (!prescription) return reply.code(404).send({ error: 'Prescription not found' })
    if (user.role === 'Patient' && prescription.patientId !== user.sub) return reply.code(403).send({ error: 'Forbidden' })
    if (!prescription.blobPath) return reply.code(404).send({ error: 'PDF not available' })
    const signedUrl = await storageService.getSignedUrl('prescriptions', prescription.blobPath, 900)
    return { signedUrl }
  })

  fastify.get('/patients/:id/prescriptions', {
    preHandler: [(fastify as any).authenticate],
  }, async (request, reply) => {
    const user = (request as any).user
    const { id } = request.params as any
    if (user.role === 'Patient' && user.sub !== id) return reply.code(403).send({ error: 'Forbidden' })

    const { data: prescriptions } = await supabase.from('Prescription')
      .select('*').eq('patientId', id).order('signedAt', { ascending: false })

    const doctorIds = [...new Set((prescriptions ?? []).map((p: any) => p.doctorId))]
    const { data: doctors } = await supabase.from('Doctor').select('id, fullName').in('id', doctorIds.length ? doctorIds : ['_'])
    const dMap = new Map((doctors ?? []).map((d: any) => [d.id, d.fullName]))

    return (prescriptions ?? []).map((p: any) => ({
      id: p.id, diagnosis: p.diagnosis, signedAt: p.signedAt,
      doctorName: dMap.get(p.doctorId), hasPdf: !!p.blobPath,
      drugs: p.drugs ?? [], notes: p.notes ?? null,
    }))
  })
}

export default prescriptionRoutes
