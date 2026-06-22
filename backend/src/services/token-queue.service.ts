import { TenantPrismaClient } from '../plugins/prisma'
import { QueueState, TokenDto } from '@cms/shared'
import { broadcastQueueUpdate } from '../realtime/token-queue.realtime'

export class TokenQueueService {
  constructor(private prisma: TenantPrismaClient, private clinicId: string) {}

  private mapToken(token: any): TokenDto {
    const patientName = token.appointment?.patient?.fullName ??
      (token as any).patient?.fullName ?? undefined
    return {
      id: token.id,
      tokenNumber: token.tokenNumber,
      patientId: token.patientId,
      patientName,
      appointmentId: token.appointmentId ?? null,
      queueDate: token.queueDate instanceof Date
        ? token.queueDate.toISOString().slice(0, 10)
        : String(token.queueDate),
      status: token.status as TokenDto['status'],
      source: token.source as TokenDto['source'],
      calledAt: token.calledAt?.toISOString() ?? null,
      completedAt: token.completedAt?.toISOString() ?? null,
    }
  }

  async getQueueState(): Promise<QueueState> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tokens = await (this.prisma as any).token.findMany({
      where: {
        queueDate: today,
      },
      include: {
        appointment: {
          include: { patient: true },
        },
      },
      orderBy: { tokenNumber: 'asc' },
    }) as any[]

    const queue: TokenDto[] = tokens.map((t: any) => this.mapToken(t))
    const currentToken = queue.find(t => t.status === 'Called') ?? null
    const calledToken = currentToken
    const waitingCount = queue.filter(t => t.status === 'Waiting').length

    return { currentToken, calledToken, waitingCount, queue }
  }

  async nextPatient(): Promise<QueueState> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await (this.prisma as any).token.updateMany({
      where: { queueDate: today, status: 'Called' },
      data: { status: 'Completed', completedAt: new Date() },
    })

    const nextToken = await (this.prisma as any).token.findFirst({
      where: { queueDate: today, status: 'Waiting' },
      orderBy: { tokenNumber: 'asc' },
    }) as any

    if (nextToken) {
      await (this.prisma as any).token.update({
        where: { id: nextToken.id },
        data: { status: 'Called', calledAt: new Date() },
      })
    }

    const state = await this.getQueueState()
    await broadcastQueueUpdate(this.clinicId, state)
    return state
  }

  async skipToken(tokenId: string): Promise<QueueState> {
    await (this.prisma as any).token.update({
      where: { id: tokenId },
      data: { status: 'Skipped' },
    })
    const state = await this.getQueueState()
    await broadcastQueueUpdate(this.clinicId, state)
    return state
  }

  async recallToken(tokenId: string): Promise<QueueState> {
    await (this.prisma as any).token.update({
      where: { id: tokenId },
      data: { status: 'Waiting' },
    })
    const state = await this.getQueueState()
    await broadcastQueueUpdate(this.clinicId, state)
    return state
  }

  async markArrived(appointmentId: string): Promise<QueueState> {
    await (this.prisma as any).appointment.update({
      where: { id: appointmentId },
      data: { status: 'Arrived' },
    })
    const state = await this.getQueueState()
    await broadcastQueueUpdate(this.clinicId, state)
    return state
  }

  async assignToken(patientId: string, appointmentId: string | null, source: 'Online' | 'WalkIn'): Promise<number> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const result = await (this.prisma as any).$transaction(async (tx: any) => {
      await tx.tokenSequence.upsert({
        where: { clinicId_queueDate: { clinicId: this.clinicId, queueDate: today } },
        create: { clinicId: this.clinicId, queueDate: today, lastToken: 0 },
        update: {},
      })
      return tx.tokenSequence.update({
        where: { clinicId_queueDate: { clinicId: this.clinicId, queueDate: today } },
        data: { lastToken: { increment: 1 } },
        select: { lastToken: true },
      })
    })

    const tokenNumber = result.lastToken

    await (this.prisma as any).token.create({
      data: {
        clinicId: this.clinicId,
        appointmentId,
        patientId,
        tokenNumber,
        queueDate: today,
        source,
        status: 'Waiting',
      },
    })

    return tokenNumber
  }
}
