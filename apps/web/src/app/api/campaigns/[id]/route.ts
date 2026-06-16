import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'

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
  }

  const data: Record<string, unknown> = {}
  if (typeof body.isOpen === 'boolean') data.isOpen = body.isOpen
  if ('maxSlots' in body) data.maxSlots = typeof body.maxSlots === 'number' && body.maxSlots > 0 ? body.maxSlots : null
  if (body.campaignType === 'campaign' || body.campaignType === 'oneshot') data.campaignType = body.campaignType

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  const updated = await prisma.campaign.update({
    where: { id: params.id },
    data,
    select: { id: true, isOpen: true, maxSlots: true, campaignType: true },
  }).catch(() => null)
  if (!updated) return NextResponse.json({ error: 'Erro ao atualizar campanha' }, { status: 500 })

  return NextResponse.json(updated)
}
