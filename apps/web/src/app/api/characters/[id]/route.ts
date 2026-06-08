import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sheet = await prisma.characterSheet.findUnique({
    where: { id: params.id },
    include: { member: { include: { user: true } } },
  }).catch(() => null)
  if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isMine = sheet.member.user.discordId === session.user.discordId
  const isGM = await prisma.campaignMember.findFirst({
    where: {
      campaignId: sheet.member.campaignId,
      user: { discordId: session.user.discordId },
      role: 'GM',
    },
  }).catch(() => null)
  if (!isMine && !isGM) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.characterAttribute.deleteMany({ where: { sheetId: params.id } }).catch(() => null)
  await prisma.characterSheet.delete({ where: { id: params.id } }).catch(() => null)

  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // params.id is the CharacterSheet ID
  const sheet = await prisma.characterSheet.findUnique({
    where: { id: params.id },
    include: { member: { include: { user: true } } },
  })
  if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isMine = sheet.member.user.discordId === session.user.discordId
  const isGM = await prisma.campaignMember.findFirst({
    where: {
      campaignId: sheet.member.campaignId,
      user: { discordId: session.user.discordId },
      role: 'GM',
    },
  })
  if (!isMine && !isGM) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as { hp?: number; maxHp?: number; level?: number; isPublic?: boolean }

  // Only the character owner can change visibility
  if (body.isPublic !== undefined && !isMine) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updated = await prisma.characterSheet.update({
    where: { id: params.id },
    data: {
      ...(body.hp !== undefined && { hp: Math.min(sheet.maxHp, Math.max(0, body.hp)) }),
      ...(body.maxHp !== undefined && { maxHp: Math.max(1, body.maxHp) }),
      ...(body.level !== undefined && { level: Math.min(20, Math.max(1, body.level)) }),
      ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
    },
  })
  return NextResponse.json(updated)
}
