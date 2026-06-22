import { PrismaClient } from '@prisma/client'

const TENANT_MODELS = new Set([
  'patient', 'doctor', 'specialization', 'doctorschedule', 'appointment',
  'tokensequence', 'token', 'visit', 'allergy', 'activemedication',
  'labreport', 'prescriptiondraft', 'prescription'
])

export function createTenantPrismaClient(clinicId: string) {
  const prisma = new PrismaClient()
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          if (!model || !TENANT_MODELS.has(model.toLowerCase())) {
            return query(args)
          }
          if (operation === 'create' || operation === 'createMany') {
            if (Array.isArray(args.data)) {
              args.data = args.data.map((d: any) => ({ ...d, clinicId }))
            } else if (args.data) {
              args.data = { ...args.data, clinicId }
            }
          }
          const needsWhere = [
            'findFirst', 'findMany', 'findUnique', 'findUniqueOrThrow',
            'findFirstOrThrow', 'update', 'updateMany', 'delete',
            'deleteMany', 'count', 'aggregate', 'groupBy', 'upsert'
          ]
          if (needsWhere.includes(operation)) {
            args.where = { ...(args.where ?? {}), clinicId }
          }
          return query(args)
        }
      }
    }
  })
}

export type TenantPrismaClient = ReturnType<typeof createTenantPrismaClient>
