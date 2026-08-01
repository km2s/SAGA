import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'

async function resolveSheet(sheetId: string, discordId: string) {
  const sheet = await prisma.characterSheet.findUnique({
    where: { id: sheetId },
    include: { member: { include: { user: true } } },
  }).catch(() => null)
  if (!sheet) return null

  const isMine = sheet.member.user.discordId === discordId
  const isGM = await prisma.campaignMember.findFirst({
    where: { campaignId: sheet.member.campaignId, user: { discordId }, role: 'GM' },
  }).catch(() => null)
  if (!isMine && !isGM) return null
  return sheet
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { level: number; total?: number; used?: number }
  if (body.level === undefined || body.level < 0 || body.level > 9) {
    return NextResponse.json({ error: 'Nível inválido (0-9)' }, { status: 400 })
  }

  const sheet = await resolveSheet(params.id, session.user.discordId)
  if (sheet) {
    const slot = await prisma.characterSpellSlot.upsert({
      where: { sheetId_level: { sheetId: params.id, level: body.level } },
      create: { sheetId: params.id, level: body.level, total: body.total ?? 0, used: body.used ?? 0 },
      update: {
        ...(body.total !== undefined && { total: Math.max(0, body.total) }),
        ...(body.used !== undefined && { used: Math.max(0, body.used) }),
      },
    })
    return NextResponse.json(slot)
  }

  // ── NPC fallback ────────────────────────────────────────────────────────────
  const npc = await prisma.nPC.findUnique({ where: { id: params.id } }).catch(() => null)
  if (!npc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const gmMember = await prisma.campaignMember.findFirst({
    where: { campaignId: npc.campaignId, user: { discordId: session.user.discordId }, role: 'GM' },
  }).catch(() => null)
  if (!gmMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const slot = await prisma.nPCSpellSlot.upsert({
    where: { npcId_level: { npcId: params.id, level: body.level } },
    create: { npcId: params.id, level: body.level, total: body.total ?? 0, used: body.used ?? 0 },
    update: {
      ...(body.total !== undefined && { total: Math.max(0, body.total) }),
      ...(body.used !== undefined && { used: Math.max(0, body.used) }),
    },
  })
  return NextResponse.json(slot)
}
