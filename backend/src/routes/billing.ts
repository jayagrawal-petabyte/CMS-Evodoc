import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { supabase } from '../plugins/supabase'

const CreateInvoiceSchema = z.object({
  patientId: z.string(),
  visitId: z.string().optional(),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number().default(1),
    unitPrice: z.number(),
  })),
  discount: z.number().min(0).max(100).default(0),
  notes: z.string().optional(),
})

const billingRoutes: FastifyPluginAsync = async (fastify) => {
  const clinicId = process.env.CLINIC_ID!

  fastify.get('/invoices', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Receptionist'])],
  }, async (request) => {
    const { patientId, status } = request.query as any
    let q = supabase.from('Invoice').select('*').eq('clinicId', clinicId).order('createdAt', { ascending: false })
    if (patientId) q = q.eq('patientId', patientId)
    if (status) q = q.eq('status', status)
    const { data: invoices } = await q.limit(100)

    if (!invoices?.length) return []

    const patientIds = [...new Set(invoices.map((i: any) => i.patientId))]
    const { data: patients } = await supabase.from('Patient').select('id, fullName, phone').in('id', patientIds)
    const pMap = new Map((patients ?? []).map((p: any) => [p.id, p]))

    return invoices.map((inv: any) => ({
      ...inv,
      patient: pMap.get(inv.patientId),
    }))
  })

  fastify.get('/invoices/:id', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Receptionist'])],
  }, async (request, reply) => {
    const { id } = request.params as any
    const { data: invoice } = await supabase.from('Invoice').select('*').eq('id', id).eq('clinicId', clinicId).single()
    if (!invoice) return reply.code(404).send({ error: 'Invoice not found' })

    const { data: patient } = await supabase.from('Patient').select('id, fullName, phone').eq('id', invoice.patientId).single()
    return { ...invoice, patient }
  })

  fastify.post('/invoices', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Receptionist'])],
  }, async (request, reply) => {
    const body = CreateInvoiceSchema.parse(request.body)
    const subtotal = body.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const discountAmount = (subtotal * body.discount) / 100
    const total = subtotal - discountAmount

    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`

    const { data, error } = await supabase.from('Invoice').insert({
      clinicId,
      patientId: body.patientId,
      visitId: body.visitId ?? null,
      invoiceNumber,
      items: body.items,
      subtotal,
      discount: body.discount,
      discountAmount,
      total,
      status: 'Unpaid',
      notes: body.notes ?? null,
    }).select().single()

    if (error) return reply.code(500).send({ error: error.message })
    return reply.code(201).send(data)
  })

  fastify.patch('/invoices/:id/pay', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Receptionist'])],
  }, async (request, reply) => {
    const { id } = request.params as any
    const { paymentMethod = 'Cash' } = request.body as any
    const { data } = await supabase.from('Invoice')
      .update({ status: 'Paid', paymentMethod, paidAt: new Date().toISOString() })
      .eq('id', id).eq('clinicId', clinicId).select().single()
    return data
  })

  fastify.delete('/invoices/:id', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Receptionist'])],
  }, async (request, reply) => {
    const { id } = request.params as any
    await supabase.from('Invoice').update({ status: 'Cancelled' }).eq('id', id).eq('clinicId', clinicId)
    return reply.code(204).send()
  })
}

export default billingRoutes
