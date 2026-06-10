import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'

function rollDice(expression: string): { rolls: number[]; total: number; modifier: number; isCrit: boolean } {
  const match = expression.match(/^(\d*)d(\d+)([+-]\d+)?$/i)
  if (!match) return { rolls: [1], total: 1, modifier: 0, isCrit: false }
  const count = parseInt(match[1] || '1')
  const sides = parseInt(match[2])
  const modifier = match[3] ? parseInt(match[3]) : 0
  const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1)
  const sum = rolls.reduce((a, b) => a + b, 0)
  const isCrit = count === 1 && sides === 20 && rolls[0] === 20
  return { rolls, total: sum + modifier, modifier, isCrit }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await prisma.campaignMember.findFirst({
    where: { campaignId: params.id, user: { discordId: session.user.discordId } },
  }).catch(() => null)
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const activeSession = await prisma.session.findFirst({
    where: { campaignId: params.id, isActive: true },
    orderBy: { startedAt: 'desc' },
    select: { id: true, tokensJson: true, musicYoutubeId: true, musicVolume: true, mapImageUrl: true },
  }).catch(() => null)

  if (!activeSession) return NextResponse.json({ rolls: [], sessionState: null })

  const url = new URL(req.url)
  const since = url.searchParams.get('since')

  const rolls = await prisma.rollLog.findMany({
    where: {
      sessionId: activeSession.id,
      ...(since ? { rolledAt: { gt: new Date(since) } } : {}),
    },
    orderBy: { rolledAt: 'desc' },
    take: 30,
  }).catch(() => [])

  return NextResponse.json({
    rolls,
    sessionState: {
      tokensJson: activeSession.tokensJson,
      musicYoutubeId: activeSession.musicYoutubeId,
      musicVolume: activeSession.musicVolume,
      mapImageUrl: activeSession.mapImageUrl,
    },
  })
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await prisma.campaignMember.findFirst({
    where: { campaignId: params.id, user: { discordId: session.user.discordId } },
  }).catch(() => null)
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as { expression?: string; attribute?: string }
  const expression = (body.expression ?? '1d20').trim().toLowerCase()
  const attribute = body.attribute ?? null

  const activeSession = await prisma.session.findFirst({
    where: { campaignId: params.id, isActive: true },
    orderBy: { startedAt: 'desc' },
  }).catch(() => null)

  if (!activeSession) return NextResponse.json({ error: 'Nenhuma sessão ativa' }, { status: 400 })

  const result = rollDice(expression)

  const rollLog = await prisma.rollLog.create({
    data: {
      expression,
      rolls: result.rolls,
      modifier: result.modifier,
      total: result.total,
      attribute,
      rolledBy: session.user.username,
      sessionId: activeSession.id,
    },
  })

  return NextResponse.json({ ...rollLog, isCrit: result.isCrit }, { status: 201 })
}
