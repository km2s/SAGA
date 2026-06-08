import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gmMember = await prisma.campaignMember.findFirst({
    where: { campaignId: params.id, user: { discordId: session.user.discordId }, role: 'GM' },
  }).catch(() => null)
  if (!gmMember) return NextResponse.json({ error: 'GM only' }, { status: 403 })

  const existing = await prisma.session.findFirst({
    where: { campaignId: params.id, isActive: true },
  }).catch(() => null)
  if (existing) return NextResponse.json({ error: 'Já existe uma sessão ativa' }, { status: 409 })

  const body = await req.json().catch(() => ({})) as { name?: string }

  const newSession = await prisma.session.create({
    data: {
      name: body.name?.trim() || null,
      campaignId: params.id,
      isActive: true,
    },
  })

  return NextResponse.json(newSession, { status: 201 })
}
