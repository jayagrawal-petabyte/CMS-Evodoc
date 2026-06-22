import { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { LoginSchema, RegisterPatientSchema } from '@cms/shared'
import { supabase } from '../plugins/supabase'

// Precomputed bcrypt hash used to equalize login timing when no account matches,
// so attackers can't enumerate registered phone numbers via response time.
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer-not-a-real-password', 12)

// Tight per-route limit for auth endpoints to blunt brute-force / credential stuffing.
const AUTH_RATE_LIMIT = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const clinicId = process.env.CLINIC_ID!

  fastify.post('/auth/login', AUTH_RATE_LIMIT, async (request, reply) => {
    const body = LoginSchema.parse(request.body)

    let user: any = null
    let role = ''

    // Try patient
    const { data: patients } = await supabase
      .from('Patient')
      .select('*')
      .eq('clinicId', clinicId)
      .eq('phone', body.phone)
      .limit(1)
    if (patients?.[0] && await bcrypt.compare(body.password, patients[0].passwordHash)) {
      user = patients[0]; role = 'Patient'
    }

    // Try doctor
    if (!user) {
      const { data: doctors } = await supabase
        .from('Doctor')
        .select('*')
        .eq('clinicId', clinicId)
        .eq('phone', body.phone)
        .eq('isActive', true)
        .limit(1)
      if (doctors?.[0] && await bcrypt.compare(body.password, doctors[0].passwordHash)) {
        user = doctors[0]; role = 'Doctor'
      }
    }

    // Try receptionist
    if (!user) {
      const { data: receps } = await supabase
        .from('Receptionist')
        .select('*')
        .eq('clinicId', clinicId)
        .eq('phone', body.phone)
        .limit(1)
      if (receps?.[0] && await bcrypt.compare(body.password, receps[0].passwordHash)) {
        user = receps[0]; role = 'Receptionist'
      }
    }

    if (!user) {
      // Burn the same time a real bcrypt.compare would, so a missing phone (fast)
      // is indistinguishable from a wrong password (slow) → no user enumeration.
      await bcrypt.compare(body.password, DUMMY_HASH)
      return reply.code(401).send({ error: 'Invalid phone number or password' })
    }

    const accessToken = jwt.sign(
      { sub: user.id, clinicId, role, fullName: user.fullName },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    )
    const refreshToken = jwt.sign(
      { sub: user.id, clinicId, role },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    )

    reply.setCookie('__refresh', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth/refresh',
    })

    return { accessToken, user: { id: user.id, fullName: user.fullName, role } }
  })

  fastify.post('/auth/register', AUTH_RATE_LIMIT, async (request, reply) => {
    const body = RegisterPatientSchema.parse(request.body)

    const { data: existing } = await supabase
      .from('Patient')
      .select('id')
      .eq('clinicId', clinicId)
      .eq('phone', body.phone)
      .limit(1)
    if (existing?.[0]) return reply.code(409).send({ error: 'Phone number already registered' })

    const passwordHash = await bcrypt.hash(body.password, 12)
    const { data, error } = await supabase.from('Patient').insert({
      clinicId,
      fullName: body.fullName,
      phone: body.phone,
      passwordHash,
      dateOfBirth: body.dateOfBirth ?? null,
      gender: body.gender ?? null,
      bloodGroup: body.bloodGroup ?? null,
    }).select('id').single()

    if (error) return reply.code(500).send({ error: error.message })
    return reply.code(201).send({ id: data.id, message: 'Registration successful' })
  })

  fastify.post('/auth/refresh', async (request, reply) => {
    const refreshToken = (request.cookies as any).__refresh
    if (!refreshToken) return reply.code(401).send({ error: 'No refresh token' })
    try {
      const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any
      const accessToken = jwt.sign(
        { sub: payload.sub, clinicId: payload.clinicId, role: payload.role },
        process.env.JWT_SECRET!,
        { expiresIn: '15m' }
      )
      return { accessToken }
    } catch {
      return reply.code(401).send({ error: 'Invalid refresh token' })
    }
  })

  fastify.post('/auth/logout', async (request, reply) => {
    reply.clearCookie('__refresh', { path: '/auth/refresh' })
    return { ok: true }
  })

  fastify.get('/auth/me', {
    preHandler: [(fastify as any).authenticate],
  }, async (request) => {
    const user = (request as any).user
    return { id: user.sub, role: user.role, fullName: user.fullName, clinicId: user.clinicId }
  })
}

export default authRoutes
