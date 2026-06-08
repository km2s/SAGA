import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    campaignId?: string
    name?: string
    race?: string
    class?: string
    level?: number
    hp?: number
    maxHp?: number
    imageUrl?: string
    systemId?: string | null
  }

  if (!body.campaignId) return NextResponse.json({ error: 'campaignId obrigatório' }, { status: 400 })
  if (!body.name?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const user = await prisma.user.findUnique({
    where: { discordId: session.user.discordId },
  }).catch(() => null)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const member = await prisma.campaignMember.findFirst({
    where: { userId: user.id, campaignId: body.campaignId },
    include: { character: true },
  }).catch(() => null)
  if (!member) return NextResponse.json({ error: 'Você não é membro desta campanha' }, { status: 403 })
  if (member.character) return NextResponse.json({ error: 'Você já tem um personagem nesta campanha' }, { status: 409 })

  const imageUrl = body.imageUrl?.trim() || null
  if (imageUrl && !/^https:\/\//i.test(imageUrl)) {
    return NextResponse.json({ error: 'imageUrl deve começar com https://' }, { status: 400 })
  }

  const maxHp = Math.max(1, body.maxHp ?? 10)
  const character = await prisma.characterSheet.create({
    data: {
      name: body.name.trim().slice(0, 100),
      race: body.race?.trim().slice(0, 60) || null,
      class: body.class?.trim().slice(0, 60) || null,
      level: Math.max(1, body.level ?? 1),
      hp: Math.max(0, Math.min(maxHp, body.hp ?? maxHp)),
      maxHp,
      imageUrl,
      memberId: member.id,
    },
  })

  // Auto-seed attributes from preset system
  if (body.systemId) {
    const systemAttrs = await prisma.systemAttribute.findMany({
      where: { systemId: body.systemId },
    }).catch(() => [])

    if (systemAttrs.length > 0) {
      await prisma.characterAttribute.createMany({
        data: systemAttrs.map(a => ({
          sheetId: character.id,
          attributeId: a.id,
          value: 10,
        })),
        skipDuplicates: true,
      }).catch(() => null)
    }
  }

  return NextResponse.json(character, { status: 201 })
}
