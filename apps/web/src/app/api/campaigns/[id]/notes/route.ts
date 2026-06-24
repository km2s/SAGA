import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'
import { noteSchema, parseBody } from '@/lib/schemas'
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

  const isGM = member.role === 'GM'

  // Filtro de visibilidade rigoroso — cada papel só vê o que tem direito
  const notes = await prisma.note.findMany({
    where: {
      campaignId: params.id,
      OR: [
        { visibility: 'CAMPAIGN' },
        { visibility: 'PRIVATE',  authorId: user.id },
        ...(isGM ? [{ visibility: 'GM_ONLY' as const }] : []),
      ],
    },
    orderBy: { createdAt: 'desc' },
  }).catch(() => [])

  return withNoCache(NextResponse.json(notes))
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

  const raw = await req.json().catch(() => ({}))
  const parsed = parseBody(noteSchema, raw)
  if (!parsed.success) {
    logSecurity({ event: 'input.validation_failed', userId: session.user.discordId, campaignId: params.id, details: { error: parsed.error } })
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }
  const { title, content, visibility } = parsed.data

  if (visibility === 'GM_ONLY' && member.role !== 'GM') {
    logSecurity({ event: 'auth.forbidden', userId: session.user.discordId, campaignId: params.id, details: { action: 'create_gm_only_note' } })
    return NextResponse.json({ error: 'Apenas o Mestre pode criar notas do tipo GM_ONLY' }, { status: 403 })
  }

  const note = await prisma.note.create({
    data: {
      title:      title ?? null,
      content,
      visibility,
      authorId:   user.id,
      campaignId: params.id,
    },
  })

  return NextResponse.json(note, { status: 201 })
}
