import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { discordId: session.user.discordId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const member = await prisma.campaignMember.findFirst({
    where: { userId: user.id, campaignId: params.id },
  })
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  const handouts = await prisma.handout.findMany({
    where: { campaignId: params.id },
    include: {
      sharedBy: { include: { user: { select: { username: true, avatar: true } } } },
      seenBy: { where: { memberId: member.id }, select: { seenAt: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(handouts)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { discordId: session.user.discordId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const member = await prisma.campaignMember.findFirst({
    where: { userId: user.id, campaignId: params.id },
  })
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })
  if (member.role !== 'GM') return NextResponse.json({ error: 'Apenas o Mestre pode compartilhar handouts' }, { status: 403 })

  const body = await req.json()
  const { title, content, imageUrl } = body

  if (!title?.trim() && !content?.trim() && !imageUrl?.trim()) {
    return NextResponse.json({ error: 'Handout deve ter título, conteúdo ou imagem' }, { status: 400 })
  }

  if (imageUrl) {
    try {
      const { protocol } = new URL(imageUrl)
      if (!['https:', 'http:'].includes(protocol)) {
        return NextResponse.json({ error: 'URL de imagem inválida' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: 'URL de imagem inválida' }, { status: 400 })
    }
  }

  const handout = await prisma.handout.create({
    data: {
      title: title?.trim() || null,
      content: content?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      campaignId: params.id,
      sharedById: member.id,
    },
    include: {
      sharedBy: { include: { user: { select: { username: true, avatar: true } } } },
      seenBy: { select: { seenAt: true } },
    },
  })

  return NextResponse.json(handout, { status: 201 })
}
