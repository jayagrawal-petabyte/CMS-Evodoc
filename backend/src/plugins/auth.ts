import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import jwt from 'jsonwebtoken'

export interface JwtPayload {
  sub: string
  clinicId: string
  role: 'Patient' | 'Receptionist' | 'Doctor'
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401).send({ error: 'Unauthorized' })
      return
    }
    const token = authHeader.slice(7)
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
      // Defense-in-depth for the shared multi-tenant DB: a token must belong to
      // this deployment's clinic, otherwise reject it outright.
      if (payload.clinicId !== process.env.CLINIC_ID) {
        reply.code(403).send({ error: 'Forbidden' })
        return
      }
      request.user = payload
    } catch {
      reply.code(401).send({ error: 'Invalid or expired token' })
    }
  })

  fastify.decorate('requireRole', (roles: string[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.user) {
        reply.code(401).send({ error: 'Unauthorized' })
        return
      }
      if (!roles.includes(request.user.role)) {
        reply.code(403).send({ error: 'Forbidden' })
      }
    }
  })
}

export default fp(authPlugin)
