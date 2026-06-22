import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

const tenantPlugin: FastifyPluginAsync = async (fastify) => {
  const clinicId = process.env.CLINIC_ID
  if (!clinicId) throw new Error('CLINIC_ID environment variable is required')
  if (!fastify.hasDecorator('clinicId')) fastify.decorate('clinicId', clinicId)
}

export default fp(tenantPlugin)
