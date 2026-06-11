import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; handoutId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { discordId: session.user.discordId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const member = await prisma.campaignMember.findFirst({
    where: { userId: user.id, campaignId: params.id },
  })
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })
  if (member.role !== 'GM') return NextResponse.json({ error: 'Apenas o Mestre pode remover handouts' }, { status: 403 })

  const handout = await prisma.handout.findUnique({ where: { id: params.handoutId } })
  if (!handout || handout.campaignId !== params.id) {
    return NextResponse.json({ error: 'Handout não encontrado' }, { status: 404 })
  }

  await prisma.handoutView.deleteMany({ where: { handoutId: params.handoutId } })
  await prisma.handout.delete({ where: { id: params.handoutId } })

  return NextResponse.json({ ok: true })
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; handoutId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { discordId: session.user.discordId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const member = await prisma.campaignMember.findFirst({
    where: { userId: user.id, campaignId: params.id },
  })
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  const handout = await prisma.handout.findUnique({ where: { id: params.handoutId } })
  if (!handout || handout.campaignId !== params.id) {
    return NextResponse.json({ error: 'Handout não encontrado' }, { status: 404 })
  }

  await prisma.handoutView.upsert({
    where: { handoutId_memberId: { handoutId: params.handoutId, memberId: member.id } },
    create: { handoutId: params.handoutId, memberId: member.id },
    update: { seenAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
