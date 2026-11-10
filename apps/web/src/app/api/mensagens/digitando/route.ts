import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'
import { conversaDe } from '@/lib/mensagens'

/** POST { conversa }: "estou escrevendo" (o navegador manda no máximo a cada 3 s enquanto digita). */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const u = await prisma.user.findUnique({ where: { discordId: session.user.discordId }, select: { id: true } }).catch(() => null)
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({})) as { conversa?: string }
  if (!b.conversa || !(await conversaDe(u.id, b.conversa))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await prisma.digitando.upsert({
    where: { userId_conversa: { userId: u.id, conversa: b.conversa } },
    update: { em: new Date() }, create: { userId: u.id, conversa: b.conversa },
  }).catch(() => null)
  return NextResponse.json({ ok: true })
}
