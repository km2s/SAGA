import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const system = await prisma.rPGSystem.findUnique({
    where: { id: params.id },
    include: {
      attributes: { orderBy: { name: 'asc' } },
      creator: { select: { username: true } },
    },
  }).catch(() => null)

  if (!system) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(system)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const system = await prisma.rPGSystem.findUnique({
    where: { id: params.id },
    include: { creator: { select: { discordId: true } } },
  }).catch(() => null)
  if (!system) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (system.isPreset || system.creator?.discordId !== session.user.discordId)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as {
    name?: string; description?: string; imageUrl?: string; category?: string
  }

  const imageUrl = body.imageUrl?.trim() || null
  if (imageUrl && !/^https:\/\//i.test(imageUrl))
    return NextResponse.json({ error: 'imageUrl deve começar com https://' }, { status: 400 })

  const updated = await prisma.rPGSystem.update({
    where: { id: params.id },
    data: {
      ...(body.name?.trim() && { name: body.name.trim().slice(0, 100) }),
      ...(body.description !== undefined && { description: body.description?.trim().slice(0, 500) || null }),
      ...(body.imageUrl !== undefined && { imageUrl }),
      ...(body.category && { category: body.category }),
    },
    include: { creator: { select: { username: true } }, attributes: true },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const system = await prisma.rPGSystem.findUnique({
    where: { id: params.id },
    include: { creator: { select: { discordId: true } } },
  }).catch(() => null)
  if (!system) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (system.isPreset || system.creator?.discordId !== session.user.discordId)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.systemAttribute.deleteMany({ where: { systemId: params.id } }).catch(() => null)
  await prisma.rPGSystem.delete({ where: { id: params.id } }).catch(() => null)

  return NextResponse.json({ success: true })
}
