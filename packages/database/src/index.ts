import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// Anotação explícita: sem ela, o tsc emite `prisma: any` no .d.ts (o cast
// `globalThis as unknown as ...` impede a inferência portável na emissão de
// declaração), fazendo todo consumidor de `database` perder os tipos do Prisma.
export const prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

export * from '@prisma/client'
