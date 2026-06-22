import { z } from 'zod'

// Full token lifecycle state machine.
//  Waiting   – created, in queue, presence not yet confirmed
//  Arrived   – checked in at reception (physically present; "pre-exam" until vitals taken)
//  Called    – called into the consultation room
//  OnHold    – patient stepped away; paused, can be resumed
//  Completed – consultation finished (terminal)
//  Skipped   – passed over temporarily; can be recalled
//  Abandoned – left without being seen / LWBS (terminal, retained for analytics)
export const TOKEN_STATUSES = [
  'Waiting', 'Arrived', 'Called', 'OnHold', 'Completed', 'Skipped', 'Abandoned',
] as const
export type TokenStatus = (typeof TOKEN_STATUSES)[number]

// Statuses that are still "active" in the live queue (not terminal)
export const ACTIVE_TOKEN_STATUSES: TokenStatus[] = ['Waiting', 'Arrived', 'Called', 'OnHold', 'Skipped']
// Statuses a doctor can actually call / start a visit on
export const CALLABLE_TOKEN_STATUSES: TokenStatus[] = ['Waiting', 'Arrived', 'Called']

export const WalkInTokenSchema = z.object({
  patientPhone: z.string().min(10).max(15),
  patientName: z.string().min(2).max(100).optional(),
  doctorId: z.string().min(1),
  createPatientIfNotFound: z.boolean().default(false),
  // Optional patient details captured at the desk when creating a new walk-in account.
  dateOfBirth: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
})

export const TokenDtoSchema = z.object({
  id: z.string(),
  tokenNumber: z.number(),
  patientId: z.string(),
  patientName: z.string().optional(),
  appointmentId: z.string().nullable(),
  queueDate: z.string(),
  status: z.enum(TOKEN_STATUSES),
  source: z.enum(['Online', 'WalkIn']),
  calledAt: z.string().nullable(),
  completedAt: z.string().nullable(),
})

export const QueueStateSchema = z.object({
  currentToken: TokenDtoSchema.nullable(),
  calledToken: TokenDtoSchema.nullable(),
  waitingCount: z.number(),
  queue: z.array(TokenDtoSchema),
})
