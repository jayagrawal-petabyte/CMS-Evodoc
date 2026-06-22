import 'dotenv/config'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import authPlugin from './plugins/auth'
import authRoutes from './routes/auth'
import clinicRoutes from './routes/clinic'
import doctorRoutes from './routes/doctors'
import patientRoutes from './routes/patients'
import appointmentRoutes from './routes/appointments'
import tokenRoutes from './routes/tokens'
import visitRoutes from './routes/visits'
import prescriptionRoutes from './routes/prescriptions'
import labReportRoutes from './routes/lab-reports'
import statsRoutes from './routes/stats'
import billingRoutes from './routes/billing'
import auditRoutes from './routes/audit'

async function build() {
  const clinicId = process.env.CLINIC_ID
  if (!clinicId) throw new Error('CLINIC_ID environment variable is required')

  const fastify = Fastify({ logger: true })

  // Allow the configured frontend origin, plus any localhost port in dev
  // (Next.js falls back to 3001/3002 when 3000 is taken — without this, those
  // origins get blocked by CORS and every API call silently fails.)
  const allowedOrigin = process.env.FRONTEND_URL ?? 'http://localhost:3000'
  await fastify.register(cors, {
    origin: (origin, cb) => {
      if (!origin || origin === allowedOrigin || /^http:\/\/localhost:\d+$/.test(origin)) {
        cb(null, true)
      } else {
        cb(new Error('Not allowed by CORS'), false)
      }
    },
    credentials: true,
  })
  await fastify.register(cookie)
  await fastify.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } })

  // Global rate limit (per IP). Auth routes set a much tighter limit per-route
  // (see routes/auth.ts) to blunt brute-force / credential-stuffing.
  // (@fastify/rate-limit v9 — compatible with Fastify 4.)
  await fastify.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: '1 minute',
  })

  // Map validation (Zod) errors to 400 instead of leaking a generic 500.
  fastify.setErrorHandler((error, request, reply) => {
    const anyErr = error as any
    if (anyErr?.name === 'ZodError' && Array.isArray(anyErr.issues)) {
      return reply.code(400).send({
        error: 'Validation failed',
        details: anyErr.issues.map((i: any) => ({ path: (i.path ?? []).join('.'), message: i.message })),
      })
    }
    if (anyErr?.statusCode) return reply.code(anyErr.statusCode).send({ error: error.message })
    request.log.error(error)
    return reply.code(500).send({ error: 'Internal Server Error' })
  })

  fastify.decorate('clinicId', clinicId)
  await fastify.register(authPlugin)

  await fastify.register(authRoutes)
  await fastify.register(clinicRoutes)
  await fastify.register(doctorRoutes)
  await fastify.register(patientRoutes)
  await fastify.register(appointmentRoutes)
  await fastify.register(tokenRoutes)
  await fastify.register(visitRoutes)
  await fastify.register(prescriptionRoutes)
  await fastify.register(labReportRoutes)
  await fastify.register(statsRoutes)
  await fastify.register(billingRoutes)
  await fastify.register(auditRoutes)

  fastify.get('/health', async () => ({ status: 'ok', clinicId }))

  return fastify
}

async function main() {
  const fastify = await build()
  const port = parseInt(process.env.PORT ?? '4000')
  await fastify.listen({ port, host: '0.0.0.0' })
  console.log(`Backend running on port ${port}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
