import { prisma } from 'database'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  // Usuários não autenticados recebem apenas confirmação de que o serviço está no ar
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ status: 'ok' })
  }

  const start = Date.now()
  let dbStatus: 'ok' | 'error' = 'error'
  let dbLatencyMs: number | null = null

  try {
    await prisma.$queryRaw`SELECT 1`
    dbLatencyMs = Date.now() - start
    dbStatus = 'ok'
  } catch {
    // Detalhes do erro não são expostos — apenas o status
  }

  const httpStatus = dbStatus === 'ok' ? 200 : 503

  return NextResponse.json(
    {
      status: dbStatus,
      db: {
        connected: dbStatus === 'ok',
        latencyMs: dbLatencyMs,
      },
      timestamp: new Date().toISOString(),
    },
    { status: httpStatus },
  )
}
