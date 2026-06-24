import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'
import { handoutSchema, parseBody } from '@/lib/schemas'
import { validateImageUrlOrError } from '@/lib/validate-url'
import { withNoCache } from '@/lib/no-cache'
import { logSecurity } from '@/lib/security-log'

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
      seenBy:   { where: { memberId: member.id }, select: { seenAt: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return withNoCache(NextResponse.json(handouts))
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
  if (member.role !== 'GM') {
    logSecurity({ event: 'auth.forbidden', userId: session.user.discordId, campaignId: params.id, details: { action: 'create_handout' } })
    return NextResponse.json({ error: 'Apenas o Mestre pode compartilhar handouts' }, { status: 403 })
  }

  const raw = await req.json().catch(() => ({}))
  const parsed = parseBody(handoutSchema, raw)
  if (!parsed.success) {
    logSecurity({ event: 'input.validation_failed', userId: session.user.discordId, campaignId: params.id, details: { error: parsed.error } })
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }
  const { title, content, imageUrl: rawImageUrl } = parsed.data

  // Validar URL de imagem contra allowlist de hosts (prevenção de SSRF)
  let imageUrl: string | null = null
  if (rawImageUrl) {
    const { value, error } = validateImageUrlOrError(rawImageUrl, 'imageUrl')
    if (error) return NextResponse.json({ error }, { status: 400 })
    imageUrl = value
  }

  const handout = await prisma.handout.create({
    data: {
      title:      title ?? null,
      content:    content ?? null,
      imageUrl,
      campaignId: params.id,
      sharedById: member.id,
    },
    include: {
      sharedBy: { include: { user: { select: { username: true, avatar: true } } } },
      seenBy:   { select: { seenAt: true } },
    },
  })

  return NextResponse.json(handout, { status: 201 })
}
