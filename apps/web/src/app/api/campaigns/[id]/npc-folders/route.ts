import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'
import { withNoCache } from '@/lib/no-cache'

function requireGM(campaignId: string, discordId: string) {
  return prisma.campaignMember.findFirst({
    where: { campaignId, user: { discordId }, role: 'GM' },
  }).catch(() => null)
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const member = await requireGM(params.id, session.user.discordId)
  if (!member) return NextResponse.json({ error: 'GM only' }, { status: 403 })

  const folders = await prisma.npcFolder.findMany({
    where: { campaignId: params.id },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, name: true, order: true, _count: { select: { npcs: true } } },
  }).catch(() => [])

  return withNoCache(NextResponse.json({ folders }))
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const member = await requireGM(params.id, session.user.discordId)
  if (!member) return NextResponse.json({ error: 'GM only' }, { status: 403 })

  const body = await req.json().catch(() => ({})) as { name?: string }
  const name = (body.name ?? '').trim().slice(0, 60)
  if (!name) return NextResponse.json({ error: 'Nome da pasta é obrigatório' }, { status: 400 })

  const order = await prisma.npcFolder.count({ where: { campaignId: params.id } }).catch(() => 0)
  const folder = await prisma.npcFolder.create({
    data: { campaignId: params.id, name, order },
    select: { id: true, name: true, order: true },
  })

  return NextResponse.json(folder)
}
