import { z } from 'zod'
import {
  LoginSchema, RegisterPatientSchema, AuthResponseSchema,
  ClinicThemeSchema, ClinicThemeResponseSchema,
  CreateDoctorSchema, UpdateDoctorSchema, DoctorDtoSchema, UpdateDoctorScheduleSchema, DoctorScheduleEntrySchema, CreateSpecializationSchema,
  PatientDtoSchema, AllergySchema, ActiveMedicationSchema, UpdatePatientSchema,
  CreateAppointmentSchema, UpdateAppointmentStatusSchema, AppointmentDtoSchema,
  WalkInTokenSchema, TokenDtoSchema, QueueStateSchema,
  VitalsSchema, DrugEntrySchema, PrescriptionDraftSchema, FinalizePrescriptionSchema, VisitDtoSchema,
  LabReportDtoSchema,
} from '../schemas'

export type LoginInput = z.infer<typeof LoginSchema>
export type RegisterPatientInput = z.infer<typeof RegisterPatientSchema>
export type AuthResponse = z.infer<typeof AuthResponseSchema>
export type ClinicThemeInput = z.infer<typeof ClinicThemeSchema>
export type ClinicThemeResponse = z.infer<typeof ClinicThemeResponseSchema>
export type CreateDoctorInput = z.infer<typeof CreateDoctorSchema>
export type UpdateDoctorInput = z.infer<typeof UpdateDoctorSchema>
export type DoctorDto = z.infer<typeof DoctorDtoSchema>
export type DoctorScheduleEntry = z.infer<typeof DoctorScheduleEntrySchema>
export type UpdateDoctorScheduleInput = z.infer<typeof UpdateDoctorScheduleSchema>
export type CreateSpecializationInput = z.infer<typeof CreateSpecializationSchema>
export type PatientDto = z.infer<typeof PatientDtoSchema>
export type AllergyInput = z.infer<typeof AllergySchema>
export type ActiveMedicationInput = z.infer<typeof ActiveMedicationSchema>
export type UpdatePatientInput = z.infer<typeof UpdatePatientSchema>
export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>
export type UpdateAppointmentStatusInput = z.infer<typeof UpdateAppointmentStatusSchema>
export type AppointmentDto = z.infer<typeof AppointmentDtoSchema>
export type WalkInTokenInput = z.infer<typeof WalkInTokenSchema>
export type TokenDto = z.infer<typeof TokenDtoSchema>
export type QueueState = z.infer<typeof QueueStateSchema>
export type VitalsInput = z.infer<typeof VitalsSchema>
export type DrugEntry = z.infer<typeof DrugEntrySchema>
export type PrescriptionDraftInput = z.infer<typeof PrescriptionDraftSchema>
export type FinalizePrescriptionInput = z.infer<typeof FinalizePrescriptionSchema>
export type VisitDto = z.infer<typeof VisitDtoSchema>
export type LabReportDto = z.infer<typeof LabReportDtoSchema>
