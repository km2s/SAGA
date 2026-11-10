import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'
import { applyRateLimit } from '@/lib/rate-limit'
import { withNoCache } from '@/lib/no-cache'
import { SEL_MSG, conversaDe, digitando, lerMensagens, registro } from '@/lib/mensagens'

async function eu() {
  const session = await getServerSession(authOptions)
  if (!session) return null
  return prisma.user.findUnique({ where: { discordId: session.user.discordId }, select: { id: true, discordId: true, username: true } }).catch(() => null)
}

/** GET ?c=<conversa>&since=ISO → mensagens da conversa e quem está escrevendo (SAGA Mensagens). */
export async function GET(req: Request) {
  const u = await eu()
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const conv = url.searchParams.get('c') ?? ''
  const c = await conversaDe(u.id, conv)
  if (!c) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const s = url.searchParams.get('since'), since = s && !isNaN(new Date(s).getTime()) ? new Date(s) : undefined
  const [mensagens, escrevendo] = await Promise.all([lerMensagens(u.id, c, since), digitando(u.id, conv)])
  return withNoCache(NextResponse.json({ mensagens, escrevendo }))
}

/**
 * POST { conversa, texto, personagem?, para? } → mensagem criada.
 * `para` (userId) = sussurro selado: só o mestre envia, para um membro da campanha.
 */
export async function POST(req: Request) {
  const u = await eu()
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rl = applyRateLimit(`msg:${u.discordId}`, { max: 40, windowMs: 60 * 1000 })
  if (rl) return rl
  const b = await req.json().catch(() => ({})) as { conversa?: string; texto?: string; personagem?: string | null; para?: string }
  const c = await conversaDe(u.id, b.conversa ?? '')
  if (!c) return NextResponse.json({ error: 'Você não pode escrever nesta conversa' }, { status: 403 })
  const texto = typeof b.texto === 'string' ? b.texto.trim().slice(0, 2000) : ''
  if (!texto) return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })
  const personagem = typeof b.personagem === 'string' && b.personagem.trim() ? b.personagem.trim().slice(0, 80) : null

  let para: string | null = null
  if (b.para) {
    if (c.tipo !== 'camp') return NextResponse.json({ error: 'Sussurro só no canal da campanha' }, { status: 400 })
    const [gm, alvo] = await Promise.all([
      prisma.campaignMember.findFirst({ where: { campaignId: c.campaignId, userId: u.id, role: 'GM' }, select: { id: true } }).catch(() => null),
      prisma.campaignMember.findFirst({ where: { campaignId: c.campaignId, userId: b.para }, select: { userId: true } }).catch(() => null),
    ])
    if (!gm) return NextResponse.json({ error: 'Só o Mestre envia sussurros' }, { status: 403 })
    if (!alvo || alvo.userId === u.id) return NextResponse.json({ error: 'Escolha alguém da campanha' }, { status: 400 })
    para = alvo.userId
  }

  const m = await prisma.mensagem.create({
    data: { texto, personagem: para ? null : personagem, deId: u.id, ...(c.tipo === 'camp' ? { campaignId: c.campaignId, paraId: para } : { paraId: c.outroId }) },
    select: SEL_MSG,
  })
  // Quem mandou parou de escrever.
  await prisma.digitando.deleteMany({ where: { userId: u.id, conversa: b.conversa } }).catch(() => null)
  return NextResponse.json(registro(m), { status: 201 })
}
