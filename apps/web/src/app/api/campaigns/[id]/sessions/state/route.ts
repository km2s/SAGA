import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await prisma.campaignMember.findFirst({
    where: { campaignId: params.id, user: { discordId: session.user.discordId } },
  }).catch(() => null)
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const isGM = member.role === 'GM'

  const activeSession = await prisma.session.findFirst({
    where: { campaignId: params.id, isActive: true },
    orderBy: { startedAt: 'desc' },
  }).catch(() => null)
  if (!activeSession) return NextResponse.json({ error: 'Nenhuma sessão ativa' }, { status: 400 })

  const body = await req.json().catch(() => ({})) as {
    tokensJson?: string | null
    musicYoutubeId?: string | null
    musicVolume?: number
    mapImageUrl?: string | null
  }

  const data: Record<string, unknown> = {}
  // Any member can update tokens (collaborative canvas)
  if ('tokensJson' in body) data.tokensJson = body.tokensJson ?? null
  // Only GM can control music and map
  if (isGM) {
    if ('musicYoutubeId' in body) data.musicYoutubeId = body.musicYoutubeId ?? null
    if ('musicVolume' in body && typeof body.musicVolume === 'number') data.musicVolume = body.musicVolume
    if ('mapImageUrl' in body) data.mapImageUrl = body.mapImageUrl ?? null
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  const updated = await prisma.session.update({
    where: { id: activeSession.id },
    data,
    select: { tokensJson: true, musicYoutubeId: true, musicVolume: true, mapImageUrl: true },
  })

  return NextResponse.json(updated)
}
