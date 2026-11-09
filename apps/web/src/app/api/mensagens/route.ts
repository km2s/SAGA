import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'
import { applyRateLimit } from '@/lib/rate-limit'
import { withNoCache } from '@/lib/no-cache'
import { conversaDe, lerMensagens, registro } from '@/lib/mensagens'

async function eu() {
  const session = await getServerSession(authOptions)
  if (!session) return null
  return prisma.user.findUnique({ where: { discordId: session.user.discordId }, select: { id: true, discordId: true, username: true } }).catch(() => null)
}

/** GET ?c=<conversa>&since=ISO → mensagens da conversa (SAGA Mensagens). */
export async function GET(req: Request) {
  const u = await eu()
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const c = await conversaDe(u.id, url.searchParams.get('c') ?? '')
  if (!c) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const s = url.searchParams.get('since'), since = s && !isNaN(new Date(s).getTime()) ? new Date(s) : undefined
  return withNoCache(NextResponse.json({ mensagens: await lerMensagens(u.id, c, since) }))
}

/** POST { conversa, texto, personagem? } → mensagem criada. */
export async function POST(req: Request) {
  const u = await eu()
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rl = applyRateLimit(`msg:${u.discordId}`, { max: 40, windowMs: 60 * 1000 })
  if (rl) return rl
  const b = await req.json().catch(() => ({})) as { conversa?: string; texto?: string; personagem?: string | null }
  const c = await conversaDe(u.id, b.conversa ?? '')
  if (!c) return NextResponse.json({ error: 'Você não pode escrever nesta conversa' }, { status: 403 })
  const texto = typeof b.texto === 'string' ? b.texto.trim().slice(0, 2000) : ''
  if (!texto) return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })
  const personagem = typeof b.personagem === 'string' && b.personagem.trim() ? b.personagem.trim().slice(0, 80) : null
  const m = await prisma.mensagem.create({
    data: { texto, personagem, deId: u.id, ...(c.tipo === 'camp' ? { campaignId: c.campaignId } : { paraId: c.outroId }) },
    select: { id: true, texto: true, personagem: true, createdAt: true, de: { select: { username: true } } },
  })
  return NextResponse.json(registro(m), { status: 201 })
}
