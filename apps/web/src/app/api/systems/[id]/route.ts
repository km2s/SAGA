import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const system = await prisma.rPGSystem.findUnique({
    where: { id: params.id },
    include: {
      attributes: { orderBy: [{ order: 'asc' }, { name: 'asc' }] },
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

  // Em uso por campanhas, fichas ou NPCs, o banco recusa; antes o erro era engolido e a rota dizia "sucesso".
  const uso = await prisma.rPGSystem.findUnique({ where: { id: params.id }, select: { _count: { select: { campaigns: true, characterSheets: true, npcSheets: true } } } })
  const c = uso?._count
  if (c && (c.campaigns || c.characterSheets || c.npcSheets)) {
    const partes = [c.campaigns && `${c.campaigns} campanha${c.campaigns === 1 ? '' : 's'}`, (c.characterSheets + c.npcSheets) && `${c.characterSheets + c.npcSheets} ficha${c.characterSheets + c.npcSheets === 1 ? '' : 's'}`].filter(Boolean)
    return NextResponse.json({ error: `Este códice está em uso (${partes.join(' e ')}) e não pode ser apagado.` }, { status: 409 })
  }
  const emFichas = await prisma.systemAttribute.count({ where: { systemId: params.id, OR: [{ characterAttributes: { some: {} } }, { npcAttributes: { some: {} } }] } })
  if (emFichas) return NextResponse.json({ error: 'Há fichas usando atributos deste códice; ele não pode ser apagado.' }, { status: 409 })

  await prisma.$transaction([
    prisma.systemAttribute.deleteMany({ where: { systemId: params.id } }),
    prisma.rPGSystem.delete({ where: { id: params.id } }),
  ])

  return NextResponse.json({ success: true })
}
