import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'
import { withNoCache } from '@/lib/no-cache'
import { conversaDe, marcarLida, naoLidas } from '@/lib/mensagens'

async function meuId() {
  const session = await getServerSession(authOptions)
  if (!session) return null
  return (await prisma.user.findUnique({ where: { discordId: session.user.discordId }, select: { id: true } }).catch(() => null))?.id ?? null
}

/** GET → { total, porConversa }: selo do header e contadores da lista. */
export async function GET() {
  const id = await meuId()
  if (!id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const porConversa = await naoLidas(id)
  return withNoCache(NextResponse.json({ total: Object.values(porConversa).reduce((a, b) => a + b, 0), porConversa }))
}

/** POST { conversa } → marca como lida agora. */
export async function POST(req: Request) {
  const id = await meuId()
  if (!id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({})) as { conversa?: string }
  if (!b.conversa || !(await conversaDe(id, b.conversa))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await marcarLida(id, b.conversa)
  return NextResponse.json({ ok: true })
}
