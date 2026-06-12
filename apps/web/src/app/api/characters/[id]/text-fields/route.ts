import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'

async function resolveSheet(sheetId: string, discordId: string) {
  const sheet = await prisma.characterSheet.findUnique({
    where: { id: sheetId },
    include: { member: { include: { user: true, campaign: true } } },
  }).catch(() => null)
  if (!sheet) return null

  const isMine = sheet.member.user.discordId === discordId
  const isGM = await prisma.campaignMember.findFirst({
    where: { campaignId: sheet.member.campaignId, user: { discordId }, role: 'GM' },
  }).catch(() => null)
  if (!isMine && !isGM) return null
  return sheet
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { key?: string; label?: string; value?: string; order?: number }
  if (!body.key?.trim()) return NextResponse.json({ error: 'key obrigatório' }, { status: 400 })

  // Try CharacterSheet first
  const sheet = await resolveSheet(params.id, session.user.discordId)
  if (sheet) {
    const field = await prisma.characterTextField.upsert({
      where: { sheetId_key: { sheetId: params.id, key: body.key } },
      create: {
        sheetId: params.id,
        key: body.key,
        label: body.label ?? body.key,
        value: body.value ?? '',
        order: body.order ?? 0,
      },
      update: {
        value: body.value ?? '',
        ...(body.label && { label: body.label }),
      },
    })
    return NextResponse.json(field)
  }

  // Fallback: NPCTextField — only GMs can edit
  const npc = await prisma.nPC.findUnique({
    where: { id: params.id },
  }).catch(() => null)
  if (!npc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isGM = await prisma.campaignMember.findFirst({
    where: { campaignId: npc.campaignId, user: { discordId: session.user.discordId }, role: 'GM' },
  }).catch(() => null)
  if (!isGM) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const field = await prisma.nPCTextField.upsert({
    where: { npcId_key: { npcId: params.id, key: body.key } },
    create: {
      npcId: params.id,
      key: body.key,
      label: body.label ?? body.key,
      value: body.value ?? '',
      order: body.order ?? 0,
    },
    update: {
      value: body.value ?? '',
      ...(body.label && { label: body.label }),
    },
  })
  return NextResponse.json(field)
}
