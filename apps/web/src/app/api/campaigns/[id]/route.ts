import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'
import { sanitizeTracks } from '@/lib/resource-tracks'
import { validateImageUrlOrError } from '@/lib/validate-url'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await prisma.campaignMember.findFirst({
    where: { campaignId: params.id, user: { discordId: session.user.discordId }, role: 'GM' },
  }).catch(() => null)
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({})) as {
    isOpen?: boolean
    maxSlots?: number | null
    campaignType?: string
    contentTone?: string | null
    playStyle?: string | null
    sessionFrequency?: string | null
    minExperience?: string | null
    resourceTracks?: unknown
    name?: string
    coverUrl?: string | null
    rollVisibility?: string
    botEnabled?: boolean
  }

  const data: Record<string, unknown> = {}
  if ('resourceTracks' in body) {
    const tracks = sanitizeTracks(body.resourceTracks)
    if (!tracks) return NextResponse.json({ error: 'Configuração de barras inválida' }, { status: 400 })
    data.resourceTracksJson = JSON.stringify(tracks)
  }
  if (typeof body.isOpen === 'boolean') data.isOpen = body.isOpen
  if (typeof body.name === 'string') {
    const nome = body.name.trim().slice(0, 100)
    if (nome.length < 2) return NextResponse.json({ error: 'O nome precisa de pelo menos 2 caracteres' }, { status: 400 })
    data.name = nome
  }
  if ('coverUrl' in body) {
    if (!body.coverUrl) data.coverUrl = null
    else { const { value, error } = validateImageUrlOrError(body.coverUrl, 'coverUrl'); if (error) return NextResponse.json({ error }, { status: 400 }); data.coverUrl = value }
  }
  if (body.rollVisibility === 'todos' || body.rollVisibility === 'mestre' || body.rollVisibility === 'escolha') data.rollVisibility = body.rollVisibility
  if (typeof body.botEnabled === 'boolean') data.botEnabled = body.botEnabled
  if ('maxSlots' in body) data.maxSlots = typeof body.maxSlots === 'number' && body.maxSlots > 0 ? body.maxSlots : null
  if (body.campaignType === 'campaign' || body.campaignType === 'oneshot') data.campaignType = body.campaignType
  if ('contentTone' in body) data.contentTone = typeof body.contentTone === 'string' ? body.contentTone : null
  if ('playStyle' in body) data.playStyle = typeof body.playStyle === 'string' ? body.playStyle : null
  if ('sessionFrequency' in body) data.sessionFrequency = typeof body.sessionFrequency === 'string' ? body.sessionFrequency : null
  if ('minExperience' in body) data.minExperience = typeof body.minExperience === 'string' ? body.minExperience : null

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  const updated = await prisma.campaign.update({
    where: { id: params.id },
    data,
    select: { id: true, name: true, coverUrl: true, rollVisibility: true, botEnabled: true, isOpen: true, maxSlots: true, campaignType: true, contentTone: true, playStyle: true, sessionFrequency: true, minExperience: true, resourceTracksJson: true },
  }).catch(() => null)
  if (!updated) return NextResponse.json({ error: 'Erro ao atualizar campanha' }, { status: 500 })

  return NextResponse.json(updated)
}
