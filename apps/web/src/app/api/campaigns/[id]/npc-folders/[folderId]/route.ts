import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'

function requireGM(campaignId: string, discordId: string) {
  return prisma.campaignMember.findFirst({
    where: { campaignId, user: { discordId }, role: 'GM' },
  }).catch(() => null)
}

export async function PATCH(req: Request, { params }: { params: { id: string; folderId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const member = await requireGM(params.id, session.user.discordId)
  if (!member) return NextResponse.json({ error: 'GM only' }, { status: 403 })

  const folder = await prisma.npcFolder.findFirst({
    where: { id: params.folderId, campaignId: params.id },
  }).catch(() => null)
  if (!folder) return NextResponse.json({ error: 'Pasta não encontrada' }, { status: 404 })

  const body = await req.json().catch(() => ({})) as { name?: string; order?: number }
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) {
    const name = body.name.trim().slice(0, 60)
    if (!name) return NextResponse.json({ error: 'Nome da pasta é obrigatório' }, { status: 400 })
    data.name = name
  }
  if (typeof body.order === 'number') data.order = Math.max(0, Math.round(body.order))

  const updated = await prisma.npcFolder.update({
    where: { id: params.folderId },
    data,
    select: { id: true, name: true, order: true },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: { id: string; folderId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const member = await requireGM(params.id, session.user.discordId)
  if (!member) return NextResponse.json({ error: 'GM only' }, { status: 403 })

  const folder = await prisma.npcFolder.findFirst({
    where: { id: params.folderId, campaignId: params.id },
  }).catch(() => null)
  if (!folder) return NextResponse.json({ error: 'Pasta não encontrada' }, { status: 404 })

  // Os NPCs da pasta não são deletados — o FK folderId é SET NULL (viram "sem pasta").
  await prisma.npcFolder.delete({ where: { id: params.folderId } }).catch(() => null)
  return new NextResponse(null, { status: 204 })
}
