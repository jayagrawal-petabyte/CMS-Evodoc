import { z } from 'zod'

export const VitalsSchema = z.object({
  bpSystolic: z.number().int().optional(),
  bpDiastolic: z.number().int().optional(),
  pulse: z.number().int().optional(),
  temperature: z.number().optional(),
  weight: z.number().optional(),
  height: z.number().optional(),
  spo2: z.number().int().optional(),
  respiratoryRate: z.number().int().optional(),
})

export const DrugEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  dose: z.string(),
  frequency: z.string(),
  duration: z.string(),
  foodTiming: z.string().optional(),
  instructions: z.string(),
})

export const PrescriptionDraftSchema = z.object({
  visitId: z.string().uuid(),
  // Core
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  drugs: z.array(DrugEntrySchema),
  // Extended EMR fields
  chiefComplaint: z.string().optional(),
  symptoms: z.string().optional(),
  vitals: z.record(z.string()).optional(),
  investigations: z.array(z.string()).optional(),
  advice: z.string().optional(),
  followUpDate: z.string().optional(),
  followUpReason: z.string().optional(),
  clinicalNotes: z.string().optional(),
})

export const FinalizePrescriptionSchema = z.object({
  visitId: z.string().uuid(),
  version: z.number().int(),
})

export const VisitDtoSchema = z.object({
  id: z.string(),
  appointmentId: z.string(),
  patientId: z.string(),
  doctorId: z.string(),
  tokenId: z.string(),
  version: z.number(),
  status: z.string(),
  createdAt: z.string(),
  patient: z.object({
    id: z.string(),
    fullName: z.string(),
    phone: z.string(),
    dateOfBirth: z.string().nullable(),
    gender: z.string().nullable(),
    bloodGroup: z.string().nullable(),
  }).optional(),
})
