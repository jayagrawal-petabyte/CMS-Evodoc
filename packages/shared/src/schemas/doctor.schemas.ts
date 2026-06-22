import { z } from 'zod'

export const CreateDoctorSchema = z.object({
  fullName: z.string().min(2).max(100),
  phone: z.string().min(10).max(15).optional().default(''),
  specializationId: z.string().uuid(),
  qualification: z.string().optional(),
  bio: z.string().optional(),
  password: z.string().min(6),
})

export const UpdateDoctorSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  specializationId: z.string().uuid().optional(),
  qualification: z.string().optional(),
  bio: z.string().optional(),
  isActive: z.boolean().optional(),
})

export const DoctorScheduleEntrySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  slotDurationMinutes: z.number().int().min(5).max(120),
  isActive: z.boolean().default(true),
})

export const UpdateDoctorScheduleSchema = z.object({
  schedules: z.array(DoctorScheduleEntrySchema),
})

export const DoctorDtoSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  specializationId: z.string(),
  specializationName: z.string().optional(),
  qualification: z.string().nullable(),
  bio: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  isActive: z.boolean(),
})

export const CreateSpecializationSchema = z.object({
  name: z.string().min(2).max(100),
})
