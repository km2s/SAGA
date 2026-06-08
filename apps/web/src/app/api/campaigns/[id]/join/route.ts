import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { discordId: session.user.discordId },
  }).catch(() => null)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
  }).catch(() => null)
  if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })

  const existing = await prisma.campaignMember.findFirst({
    where: { userId: user.id, campaignId: campaign.id },
  }).catch(() => null)
  if (existing) return NextResponse.json({ error: 'Você já é membro desta campanha' }, { status: 409 })

  const member = await prisma.campaignMember.create({
    data: { userId: user.id, campaignId: campaign.id, role: 'PLAYER' },
  })

  return NextResponse.json(member, { status: 201 })
}
