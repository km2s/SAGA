import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'

const FASES = ['intro', 'guide', 'min', 'closed']
const PASSOS = ['conta', 'campanha', 'mestre', 'npc', 'dado', 'mesa']
type Prefs = Record<string, unknown>
const ler = (raw: string | null | undefined): Prefs => { try { const v = JSON.parse(raw ?? '{}') as unknown; return v && typeof v === 'object' ? v as Prefs : {} } catch { return {} } }

/** Progresso de Primeiros Passos no usuário (vale em qualquer dispositivo). Fica em `User.prefsJson.tour`. */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const u = await prisma.user.findUnique({ where: { discordId: session.user.discordId }, select: { prefsJson: true } }).catch(() => null)
  return NextResponse.json({ tour: ler(u?.prefsJson).tour ?? null })
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({})) as { phase?: string; done?: Record<string, unknown>; cur?: string }
  if (!FASES.includes(b.phase ?? '') || !PASSOS.includes(b.cur ?? '')) return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  const tour = { phase: b.phase, cur: b.cur, done: Object.fromEntries(PASSOS.filter(p => b.done?.[p]).map(p => [p, 1])) }
  const u = await prisma.user.findUnique({ where: { discordId: session.user.discordId }, select: { prefsJson: true } }).catch(() => null)
  if (!u) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  await prisma.user.update({ where: { discordId: session.user.discordId }, data: { prefsJson: JSON.stringify({ ...ler(u.prefsJson), tour }) } })
  return NextResponse.json({ ok: true })
}
