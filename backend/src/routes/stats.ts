import { FastifyPluginAsync } from 'fastify'
import { supabase } from '../plugins/supabase'

const statsRoutes: FastifyPluginAsync = async (fastify) => {
  const clinicId = process.env.CLINIC_ID!

  fastify.get('/stats/dashboard', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Receptionist'])],
  }, async () => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
    const todayStr = today.toISOString()
    const tomorrowStr = tomorrow.toISOString()

    const [
      { count: totalDoctors },
      { count: todayAppointments },
      { count: todayTokens },
      { data: tokenStatuses },
      { count: totalPatients },
    ] = await Promise.all([
      supabase.from('Doctor').select('*', { count: 'exact', head: true }).eq('clinicId', clinicId).eq('isActive', true),
      supabase.from('Appointment').select('*', { count: 'exact', head: true }).eq('clinicId', clinicId).gte('slotStart', todayStr).lt('slotStart', tomorrowStr).neq('status', 'Cancelled'),
      supabase.from('Token').select('*', { count: 'exact', head: true }).eq('clinicId', clinicId).gte('createdAt', todayStr),
      supabase.from('Token').select('status').eq('clinicId', clinicId).gte('createdAt', todayStr),
      supabase.from('Patient').select('*', { count: 'exact', head: true }).eq('clinicId', clinicId),
    ])

    const statusCounts: Record<string, number> = {}
    for (const t of (tokenStatuses ?? [])) {
      statusCounts[t.status] = (statusCounts[t.status] ?? 0) + 1
    }

    return {
      totalDoctors: totalDoctors ?? 0,
      todayAppointments: todayAppointments ?? 0,
      todayTokens: todayTokens ?? 0,
      waiting: statusCounts['Waiting'] ?? 0,
      called: statusCounts['Called'] ?? 0,
      completed: statusCounts['Completed'] ?? 0,
      totalPatients: totalPatients ?? 0,
    }
  })

  fastify.get('/stats/analytics', {
    preHandler: [(fastify as any).authenticate, (fastify as any).requireRole(['Receptionist', 'Doctor'])],
  }, async (request) => {
    const user = (request as any).user
    const { days = '7' } = request.query as any
    const numDays = Math.min(parseInt(days), 30)
    const from = new Date(); from.setDate(from.getDate() - numDays + 1); from.setHours(0, 0, 0, 0)

    // Doctors see only their own data; receptionists see clinic-wide
    const scopeToDoctor = user.role === 'Doctor' ? user.sub : null

    let apptQuery = supabase.from('Appointment')
      .select('slotStart, status, doctorId')
      .eq('clinicId', clinicId)
      .gte('slotStart', from.toISOString())
    if (scopeToDoctor) apptQuery = apptQuery.eq('doctorId', scopeToDoctor)
    const { data: appointments } = await apptQuery.order('slotStart')

    const { data: tokens } = await supabase.from('Token')
      .select('createdAt, status, source')
      .eq('clinicId', clinicId)
      .gte('createdAt', from.toISOString())

    // Build daily breakdown
    const dailyMap: Record<string, { date: string; appointments: number; walkins: number; completed: number }> = {}
    for (let i = 0; i < numDays; i++) {
      const d = new Date(from); d.setDate(d.getDate() + i)
      const key = d.toISOString().split('T')[0]
      dailyMap[key] = { date: key, appointments: 0, walkins: 0, completed: 0 }
    }

    for (const a of (appointments ?? [])) {
      const key = new Date(a.slotStart).toISOString().split('T')[0]
      if (dailyMap[key]) {
        dailyMap[key].appointments++
        if (a.status === 'Completed') dailyMap[key].completed++
      }
    }

    for (const t of (tokens ?? [])) {
      const key = new Date(t.createdAt).toISOString().split('T')[0]
      if (dailyMap[key] && (t as any).source === 'WalkIn') dailyMap[key].walkins++
    }

    // Doctor-wise count
    const doctorCounts: Record<string, number> = {}
    for (const a of (appointments ?? [])) {
      doctorCounts[a.doctorId] = (doctorCounts[a.doctorId] ?? 0) + 1
    }

    const { data: doctors } = await supabase.from('Doctor').select('id, fullName').eq('clinicId', clinicId)
    const dMap = new Map((doctors ?? []).map((d: any) => [d.id, d.fullName]))

    const doctorBreakdown = Object.entries(doctorCounts)
      .map(([id, count]) => ({ doctorId: id, doctorName: dMap.get(id) ?? 'Unknown', count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      daily: Object.values(dailyMap),
      doctorBreakdown,
      totals: {
        appointments: appointments?.length ?? 0,
        completed: (appointments ?? []).filter(a => a.status === 'Completed').length,
        tokens: tokens?.length ?? 0,
      },
    }
  })
}

export default statsRoutes
