import { FastifyPluginAsync } from 'fastify'
import { supabase } from '../plugins/supabase'

const auditRoutes: FastifyPluginAsync = async (fastify) => {
  const clinicId = process.env.CLINIC_ID!

  fastify.get('/audit-logs', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Receptionist'])],
  }, async (request) => {
    const { limit = '50', offset = '0', action, userId } = request.query as any

    let q = supabase.from('AuditLog')
      .select('*')
      .eq('clinicId', clinicId)
      .order('createdAt', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

    if (action) q = q.eq('action', action)
    if (userId) q = q.eq('userId', userId)

    const { data } = await q
    return data ?? []
  })

  fastify.post('/audit-logs', {
    preHandler: [(fastify as any).authenticate],
  }, async (request, reply) => {
    const { action, entityType, entityId, metadata } = request.body as any
    const user = (request as any).user

    const { data, error } = await supabase.from('AuditLog').insert({
      clinicId,
      userId: user.sub,
      userRole: user.role,
      userFullName: user.fullName,
      action,
      entityType,
      entityId,
      metadata: metadata ?? {},
    }).select().single()

    if (error) return reply.code(500).send({ error: error.message })
    return reply.code(201).send(data)
  })
}

export default auditRoutes

// Helper called from other routes to log actions
export async function logAudit(clinicId: string, userId: string, userRole: string, userFullName: string, action: string, entityType: string, entityId?: string, metadata?: any) {
  void supabase.from('AuditLog').insert({
    clinicId, userId, userRole, userFullName, action, entityType, entityId: entityId ?? null, metadata: metadata ?? {},
  })
}
