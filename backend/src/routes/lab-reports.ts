import { FastifyPluginAsync } from 'fastify'
import { storageService } from '../services/storage.service'
import { supabase } from '../plugins/supabase'

const labReportRoutes: FastifyPluginAsync = async (fastify) => {
  const clinicId = process.env.CLINIC_ID!

  fastify.get('/lab-reports', {
    preHandler: [(fastify as any).authenticate],
  }, async (request) => {
    const user = (request as any).user
    const { patientId, visitId } = request.query as any

    let q = supabase.from('LabReport').select('*').eq('clinicId', clinicId)
    if (user.role === 'Patient') q = q.eq('patientId', user.sub)
    else if (patientId) q = q.eq('patientId', patientId)
    if (visitId) q = q.eq('visitId', visitId)
    const { data } = await q.order('uploadedAt', { ascending: false })
    return data ?? []
  })

  fastify.post('/lab-reports', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Doctor', 'Receptionist'])],
  }, async (request, reply) => {
    const user = (request as any).user
    const parts = (request as any).parts()

    let patientId = '', visitId: string | undefined, reportName = ''
    let fileBuffer: Buffer | null = null
    let mimetype = 'application/pdf', filename = 'report.pdf'

    for await (const part of parts) {
      if (part.type === 'field') {
        if (part.fieldname === 'patientId') patientId = part.value as string
        if (part.fieldname === 'visitId') visitId = part.value as string
        if (part.fieldname === 'reportName') reportName = part.value as string
      } else if (part.type === 'file') {
        fileBuffer = await part.toBuffer()
        mimetype = part.mimetype
        filename = part.filename
      }
    }

    if (!patientId || !reportName || !fileBuffer) return reply.code(400).send({ error: 'patientId, reportName and file are required' })

    const ext = filename.split('.').pop() ?? 'pdf'
    const path = `${clinicId}/${patientId}/${Date.now()}-${filename}`
    await storageService.upload('lab-reports', path, fileBuffer, mimetype)

    const { data, error } = await supabase.from('LabReport').insert({
      clinicId, patientId, visitId: visitId || null,
      reportName, blobPath: path, uploadedBy: user.sub,
    }).select().single()
    if (error) return reply.code(500).send({ error: error.message })
    return reply.code(201).send(data)
  })

  fastify.get('/lab-reports/:id/download', {
    preHandler: [(fastify as any).authenticate],
  }, async (request, reply) => {
    const user = (request as any).user
    const { id } = request.params as any
    const { data: report } = await supabase.from('LabReport').select('*').eq('id', id).eq('clinicId', clinicId).single()
    if (!report) return reply.code(404).send({ error: 'Report not found' })
    if (user.role === 'Patient' && report.patientId !== user.sub) return reply.code(403).send({ error: 'Forbidden' })
    const signedUrl = await storageService.getSignedUrl('lab-reports', report.blobPath, 900)
    return { signedUrl }
  })
}

export default labReportRoutes
