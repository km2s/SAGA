import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; sessionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await prisma.campaignMember.findFirst({
    where: { campaignId: params.id, user: { discordId: session.user.discordId }, role: 'GM' },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sessionRecord = await prisma.session.findFirst({
    where: { id: params.sessionId, campaignId: params.id },
  })
  if (!sessionRecord) return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })

  const body = await req.json() as { content?: string }
  if (!body.content?.trim()) return NextResponse.json({ error: 'Conteúdo obrigatório' }, { status: 400 })

  const summary = await prisma.sessionSummary.upsert({
    where: { sessionId: params.sessionId },
    update: { content: body.content.trim().slice(0, 10000) },
    create: { sessionId: params.sessionId, content: body.content.trim().slice(0, 10000) },
  })

  return NextResponse.json(summary)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; sessionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await prisma.campaignMember.findFirst({
    where: { campaignId: params.id, user: { discordId: session.user.discordId }, role: 'GM' },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sessionRecord = await prisma.session.findFirst({
    where: { id: params.sessionId, campaignId: params.id },
  })
  if (!sessionRecord) return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })

  await prisma.sessionSummary.deleteMany({ where: { sessionId: params.sessionId } })
  return NextResponse.json({ ok: true })
}
