import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'

async function authorizeOwner(systemId: string, discordId: string) {
  const system = await prisma.rPGSystem.findUnique({
    where: { id: systemId },
    include: { creator: { select: { discordId: true } } },
  }).catch(() => null)
  if (!system) return null
  if (system.isPreset || system.creator?.discordId !== discordId) return null
  return system
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const system = await authorizeOwner(params.id, session.user.discordId)
  if (!system) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as { name?: string; defaultDie?: string; description?: string }
  if (!body.name?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const attr = await prisma.systemAttribute.create({
    data: {
      name: body.name.trim().slice(0, 80),
      defaultDie: body.defaultDie?.trim() || 'd20',
      description: body.description?.trim().slice(0, 200) || null,
      systemId: params.id,
    },
  })

  return NextResponse.json(attr, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const system = await authorizeOwner(params.id, session.user.discordId)
  if (!system) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { attributeId } = await req.json() as { attributeId?: string }
  if (!attributeId) return NextResponse.json({ error: 'attributeId obrigatório' }, { status: 400 })

  await prisma.systemAttribute.delete({ where: { id: attributeId } }).catch(() => null)
  return NextResponse.json({ success: true })
}
