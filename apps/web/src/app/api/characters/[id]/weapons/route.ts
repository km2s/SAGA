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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    name?: string; attackBonus?: string; damage?: string
    damageType?: string; range?: string; properties?: string
  }
  if (!body.name?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const sheet = await resolveSheet(params.id, session.user.discordId)
  if (sheet) {
    const count = await prisma.characterWeapon.count({ where: { sheetId: params.id } })
    const weapon = await prisma.characterWeapon.create({
      data: {
        sheetId: params.id,
        name: body.name.trim(),
        attackBonus: body.attackBonus?.trim() || null,
        damage: body.damage?.trim() || null,
        damageType: body.damageType?.trim() || null,
        range: body.range?.trim() || null,
        properties: body.properties?.trim() || null,
        order: count,
      },
    })
    return NextResponse.json(weapon, { status: 201 })
  }

  // ── NPC fallback ────────────────────────────────────────────────────────────
  const npc = await prisma.nPC.findUnique({ where: { id: params.id } }).catch(() => null)
  if (!npc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const gmMember = await prisma.campaignMember.findFirst({
    where: { campaignId: npc.campaignId, user: { discordId: session.user.discordId }, role: 'GM' },
  }).catch(() => null)
  if (!gmMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const count = await prisma.nPCWeapon.count({ where: { npcId: params.id } })
  const weapon = await prisma.nPCWeapon.create({
    data: {
      npcId: params.id,
      name: body.name.trim(),
      attackBonus: body.attackBonus?.trim() || null,
      damage: body.damage?.trim() || null,
      damageType: body.damageType?.trim() || null,
      range: body.range?.trim() || null,
      properties: body.properties?.trim() || null,
      order: count,
    },
  })
  return NextResponse.json(weapon, { status: 201 })
}
