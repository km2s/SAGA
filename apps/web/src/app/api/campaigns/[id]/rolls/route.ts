import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { withNoCache } from '@/lib/no-cache'
import { logSecurity } from '@/lib/security-log'

const DICE_RE    = /^(\d*)d(\d+)([+-]\d+)?$/i
const MAX_COUNT  = 100
const MAX_SIDES  = 1000
const MAX_MOD    = 10_000

function rollDice(expression: string): { rolls: number[]; total: number; modifier: number; isCrit: boolean } | null {
  const match = expression.match(DICE_RE)
  if (!match) return null
  const count    = parseInt(match[1] || '1')
  const sides    = parseInt(match[2]!)
  const modifier = match[3] ? parseInt(match[3]) : 0
  if (count < 1 || count > MAX_COUNT)      return null
  if (sides < 2 || sides > MAX_SIDES)      return null
  if (Math.abs(modifier) > MAX_MOD)        return null
  const rolls  = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1)
  const sum    = rolls.reduce((a, b) => a + b, 0)
  const isCrit = count === 1 && sides === 20 && rolls[0] === 20
  return { rolls, total: sum + modifier, modifier, isCrit }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [member, activeSession] = await Promise.all([
    prisma.campaignMember.findFirst({
      where: { campaignId: params.id, user: { discordId: session.user.discordId } },
    }).catch(() => null),
    prisma.session.findFirst({
      where: { campaignId: params.id, isActive: true },
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        tokensJson: true,
        musicYoutubeId: true,
        musicVolume: true,
        mapImageUrl: true,
        liveMembersJson: true,
        markersJson: true,
      },
    }).catch(() => null),
  ])
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!activeSession) {
    return withNoCache(NextResponse.json({ rolls: [], sessionState: null }))
  }

  const url   = new URL(req.url)
  const since = url.searchParams.get('since')
  let sinceDate: Date | undefined
  if (since) {
    const parsed = new Date(since)
    if (!isNaN(parsed.getTime())) sinceDate = parsed
  }

  const rolls = await prisma.rollLog.findMany({
    where: {
      sessionId: activeSession.id,
      ...(sinceDate ? { rolledAt: { gt: sinceDate } } : {}),
    },
    orderBy: { rolledAt: 'desc' },
    take: 30,
  }).catch(() => [])

  return withNoCache(NextResponse.json({
    rolls,
    sessionState: {
      tokensJson:      activeSession.tokensJson,
      musicYoutubeId:  activeSession.musicYoutubeId,
      musicVolume:     activeSession.musicVolume,
      mapImageUrl:     activeSession.mapImageUrl,
      liveMembersJson: activeSession.liveMembersJson,
      markersJson:     activeSession.markersJson,
    },
  }))
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit: 120 rolagens/minuto por campanha por usuário
  const rateLimitRes = applyRateLimit(
    `roll:${session.user.discordId}:${params.id}`,
    RATE_LIMITS.diceRoll,
  )
  if (rateLimitRes) {
    logSecurity({ event: 'rate_limit.exceeded', userId: session.user.discordId, campaignId: params.id, path: '/api/campaigns/[id]/rolls' })
    return rateLimitRes
  }

  const member = await prisma.campaignMember.findFirst({
    where: { campaignId: params.id, user: { discordId: session.user.discordId } },
  }).catch(() => null)
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body      = await req.json().catch(() => ({})) as { expression?: string; attribute?: string; message?: string }
  const rawExpr   = (body.expression ?? '1d20').trim().toLowerCase().slice(0, 30)
  const attribute = typeof body.attribute === 'string' ? body.attribute.slice(0, 80) : null

  // Mensagem de chat — armazenada com expression="chat"
  if (rawExpr === 'chat') {
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 500) : ''
    if (!message) return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })

    const activeSession = await prisma.session.findFirst({
      where: { campaignId: params.id, isActive: true },
      orderBy: { startedAt: 'desc' },
    }).catch(() => null)
    if (!activeSession) return NextResponse.json({ error: 'Nenhuma sessão ativa' }, { status: 400 })

    const rollLog = await prisma.rollLog.create({
      data: {
        expression: 'chat',
        rolls:      [],
        modifier:   0,
        total:      0,
        attribute:  message,
        rolledBy:   session.user.username,
        sessionId:  activeSession.id,
      },
    })
    return NextResponse.json({ ...rollLog, isCrit: false }, { status: 201 })
  }

  const result = rollDice(rawExpr)
  if (!result) {
    return NextResponse.json(
      { error: 'Expressão inválida. Use o formato XdY±Z (ex: 2d6+3). Máximo: 100 dados, d1000, modificador ±10000.' },
      { status: 400 },
    )
  }

  const activeSession = await prisma.session.findFirst({
    where: { campaignId: params.id, isActive: true },
    orderBy: { startedAt: 'desc' },
  }).catch(() => null)
  if (!activeSession) return NextResponse.json({ error: 'Nenhuma sessão ativa' }, { status: 400 })

  const rollLog = await prisma.rollLog.create({
    data: {
      expression: rawExpr,
      rolls:      result.rolls,
      modifier:   result.modifier,
      total:      result.total,
      attribute,
      rolledBy:   session.user.username,
      sessionId:  activeSession.id,
    },
  })

  return NextResponse.json({ ...rollLog, isCrit: result.isCrit }, { status: 201 })
}
