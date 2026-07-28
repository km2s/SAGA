import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sheet = await prisma.characterSheet.findUnique({
    where: { id: params.id },
    include: {
      member: {
        include: {
          user: true,
          campaign: { include: { system: true } },
        },
      },
      attributes: {
        include: { attribute: true },
        orderBy: { attribute: { name: 'asc' } },
      },
      textFields: { orderBy: { order: 'asc' } },
      weapons:    { orderBy: { order: 'asc' } },
      spellSlots: { orderBy: { level: 'asc' } },
    },
  }).catch(() => null)

  if (sheet) {
    const isMine = sheet.member.user.discordId === session.user.discordId
    const gmMembership = await prisma.campaignMember.findFirst({
      where: {
        campaignId: sheet.member.campaignId,
        user: { discordId: session.user.discordId },
        role: 'GM',
      },
    }).catch(() => null)

    if (!isMine && !gmMembership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    return NextResponse.json({
      level: sheet.level,
      systemName: sheet.member.campaign.system?.name ?? null,
      canEdit: isMine || !!gmMembership,
      attributes: sheet.attributes,
      textFields:  sheet.textFields,
      weapons:     sheet.weapons,
      spellSlots:  sheet.spellSlots,
    })
  }

  // ── NPC fallback ─────────────────────────────────────────────────────────────
  const npc = await prisma.nPC.findUnique({
    where: { id: params.id },
    include: {
      campaign: { include: { system: true } },
      sheetSystem: { select: { name: true } },
      attributes: {
        include: { attribute: true },
        orderBy: { attribute: { name: 'asc' } },
      },
      textFields: { orderBy: { order: 'asc' } },
      weapons:    { orderBy: { order: 'asc' } },
      spellSlots: { orderBy: { level: 'asc' } },
    },
  }).catch(() => null)

  if (!npc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const gmMembership = await prisma.campaignMember.findFirst({
    where: {
      campaignId: npc.campaignId,
      user: { discordId: session.user.discordId },
      role: 'GM',
    },
  }).catch(() => null)

  if (!gmMembership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json({
    level: npc.level,
    // NPCs com template próprio renderizam a ficha do sistema-modelo
    systemName: npc.sheetSystem?.name ?? npc.campaign.system?.name ?? null,
    canEdit: true,
    attributes: npc.attributes,
    textFields:  npc.textFields,
    weapons:     npc.weapons,
    spellSlots:  npc.spellSlots,
  })
}
