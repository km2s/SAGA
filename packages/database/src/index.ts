import { PrismaClient } from '../../../apps/web/.prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// Always reuse the same instance across hot-reloads (dev) and warm lambdas (prod)
export const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

export * from '../../../apps/web/.prisma/client'
