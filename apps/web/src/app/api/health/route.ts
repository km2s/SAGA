import { prisma } from 'database'
import { NextResponse } from 'next/server'

export async function GET() {
  const start = Date.now()

  let dbStatus: 'ok' | 'error' = 'error'
  let dbLatencyMs: number | null = null
  let dbError: string | null = null

  try {
    await prisma.$queryRaw`SELECT 1`
    dbLatencyMs = Date.now() - start
    dbStatus = 'ok'
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err)
  }

  const status = dbStatus === 'ok' ? 200 : 503

  return NextResponse.json(
    {
      status: dbStatus,
      db: {
        connected: dbStatus === 'ok',
        latencyMs: dbLatencyMs,
        error: dbError,
      },
      env: {
        hasDbUrl: !!process.env.DATABASE_URL,
        hasDirectUrl: !!process.env.DIRECT_URL,
        dbUrlHost: process.env.DATABASE_URL
          ? new URL(process.env.DATABASE_URL.replace(/\?.*$/, '')).hostname
          : null,
      },
      timestamp: new Date().toISOString(),
    },
    { status }
  )
}
