import { FastifyPluginAsync } from 'fastify'
import { ClinicThemeSchema } from '@cms/shared'
import { storageService } from '../services/storage.service'
import { supabase } from '../plugins/supabase'
import { getQueueDate } from '../lib/date'

function sanitizeColor(raw: string): string {
  if (/^#[0-9a-fA-F]{3,6}$/.test(raw)) return raw
  if (/^(rgb|hsl)a?\([^)]{1,60}\)$/.test(raw)) return raw
  return '#6366f1'
}

const clinicRoutes: FastifyPluginAsync = async (fastify) => {
  const clinicId = process.env.CLINIC_ID!

  fastify.get('/clinic/theme', async () => {
    const { data: theme } = await supabase
      .from('ClinicTheme')
      .select('*')
      .eq('clinicId', clinicId)
      .single()

    if (!theme) {
      return {
        id: null, clinicId,
        primaryColor: '#6366f1', secondaryColor: '#8b5cf6', accentColor: '#06b6d4',
        fontFamily: 'Inter', logoBlobPath: null, logoUrl: null,
        clinicDisplayName: 'CareDesk Clinic', updatedAt: new Date().toISOString(),
      }
    }

    const logoUrl = theme.logoBlobPath
      ? storageService.getPublicUrl('clinic-assets', theme.logoBlobPath)
      : null
    return { ...theme, logoUrl }
  })

  fastify.put('/clinic/theme', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Receptionist', 'Doctor'])],
  }, async (request, reply) => {
    const body = ClinicThemeSchema.parse(request.body)
    const data = {
      primaryColor: sanitizeColor(body.primaryColor),
      secondaryColor: sanitizeColor(body.secondaryColor),
      accentColor: sanitizeColor(body.accentColor),
      fontFamily: body.fontFamily,
      clinicDisplayName: body.clinicDisplayName,
      clinicId,
    }

    const { data: existing } = await supabase.from('ClinicTheme').select('id').eq('clinicId', clinicId).single()
    if (existing) {
      const { data: theme } = await supabase.from('ClinicTheme').update(data).eq('clinicId', clinicId).select().single()
      return theme
    } else {
      const { data: theme } = await supabase.from('ClinicTheme').insert(data).select().single()
      return theme
    }
  })

  fastify.put('/clinic/theme/logo', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Receptionist', 'Doctor'])],
  }, async (request, reply) => {
    const file = await (request as any).file()
    if (!file) return reply.code(400).send({ error: 'No file uploaded' })

    const ext = file.filename.split('.').pop() ?? 'png'
    const path = `${clinicId}/logo.${ext}`
    const buffer = await file.toBuffer()
    await storageService.upload('clinic-assets', path, buffer, file.mimetype)

    await supabase.from('ClinicTheme').upsert({ clinicId, logoBlobPath: path, clinicDisplayName: 'Clinic', updatedAt: new Date().toISOString() })
    return { logoUrl: storageService.getPublicUrl('clinic-assets', path) }
  })

  fastify.get('/dashboard/stats', {
    preHandler: [(fastify as any).authenticate],
  }, async () => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
    const todayStr = today.toISOString()
    const tomorrowStr = tomorrow.toISOString()
    const todayDate = getQueueDate()

    const [appts, walkIns, completed, queue] = await Promise.all([
      supabase.from('Appointment').select('id', { count: 'exact', head: true }).gte('slotStart', todayStr).lt('slotStart', tomorrowStr),
      supabase.from('Appointment').select('id', { count: 'exact', head: true }).gte('slotStart', todayStr).lt('slotStart', tomorrowStr).eq('source', 'WalkIn'),
      supabase.from('Visit').select('id', { count: 'exact', head: true }).eq('status', 'Completed').gte('createdAt', todayStr).lt('createdAt', tomorrowStr),
      supabase.from('Token').select('id', { count: 'exact', head: true }).eq('queueDate', todayDate).eq('status', 'Waiting'),
    ])

    return {
      totalAppointments: appts.count ?? 0,
      walkIns: walkIns.count ?? 0,
      completed: completed.count ?? 0,
      queueLength: queue.count ?? 0,
    }
  })
}

export default clinicRoutes
