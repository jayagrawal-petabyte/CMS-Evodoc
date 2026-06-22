import { z } from 'zod'

export const LabReportDtoSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  visitId: z.string().nullable(),
  reportName: z.string(),
  blobPath: z.string(),
  uploadedAt: z.string(),
  uploadedBy: z.string(),
})
