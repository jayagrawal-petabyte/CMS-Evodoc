import { z } from 'zod'

export const CreateAppointmentSchema = z.object({
  doctorId: z.string().min(1),
  slotStart: z.string().datetime(),
  slotEnd: z.string().datetime(),
})

export const UpdateAppointmentStatusSchema = z.object({
  status: z.enum(['Scheduled', 'Arrived', 'Completed', 'Cancelled']),
})

export const AppointmentDtoSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  doctorId: z.string(),
  patientName: z.string().optional(),
  doctorName: z.string().optional(),
  slotStart: z.string(),
  slotEnd: z.string(),
  status: z.string(),
  source: z.string(),
  createdAt: z.string(),
  tokenNumber: z.number().optional(),
})
