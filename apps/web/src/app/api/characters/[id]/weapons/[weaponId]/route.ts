import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'

async function resolveCharWeapon(sheetId: string, weaponId: string, discordId: string) {
  const weapon = await prisma.characterWeapon.findUnique({
    where: { id: weaponId },
    include: { sheet: { include: { member: { include: { user: true } } } } },
  }).catch(() => null)
  if (!weapon || weapon.sheetId !== sheetId) return null

  const isMine = weapon.sheet.member.user.discordId === discordId
  const isGM = await prisma.campaignMember.findFirst({
    where: { campaignId: weapon.sheet.member.campaignId, user: { discordId }, role: 'GM' },
  }).catch(() => null)
  if (!isMine && !isGM) return null
  return weapon
}

async function resolveNpcWeapon(npcId: string, weaponId: string, discordId: string) {
  const weapon = await prisma.nPCWeapon.findUnique({
    where: { id: weaponId },
    include: { npc: true },
  }).catch(() => null)
  if (!weapon || weapon.npcId !== npcId) return null

  const isGM = await prisma.campaignMember.findFirst({
    where: { campaignId: weapon.npc.campaignId, user: { discordId }, role: 'GM' },
  }).catch(() => null)
  if (!isGM) return null
  return weapon
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; weaponId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    name?: string; attackBonus?: string; damage?: string
    damageType?: string; range?: string; properties?: string
  }

  const patchData = {
    ...(body.name !== undefined && { name: body.name.trim() }),
    ...(body.attackBonus !== undefined && { attackBonus: body.attackBonus.trim() || null }),
    ...(body.damage !== undefined && { damage: body.damage.trim() || null }),
    ...(body.damageType !== undefined && { damageType: body.damageType.trim() || null }),
    ...(body.range !== undefined && { range: body.range.trim() || null }),
    ...(body.properties !== undefined && { properties: body.properties.trim() || null }),
  }

  const charWeapon = await resolveCharWeapon(params.id, params.weaponId, session.user.discordId)
  if (charWeapon) {
    const updated = await prisma.characterWeapon.update({ where: { id: params.weaponId }, data: patchData })
    return NextResponse.json(updated)
  }

  const npcWeapon = await resolveNpcWeapon(params.id, params.weaponId, session.user.discordId)
  if (!npcWeapon) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.nPCWeapon.update({ where: { id: params.weaponId }, data: patchData })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; weaponId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const charWeapon = await resolveCharWeapon(params.id, params.weaponId, session.user.discordId)
  if (charWeapon) {
    await prisma.characterWeapon.delete({ where: { id: params.weaponId } })
    return NextResponse.json({ success: true })
  }

  const npcWeapon = await resolveNpcWeapon(params.id, params.weaponId, session.user.discordId)
  if (!npcWeapon) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.nPCWeapon.delete({ where: { id: params.weaponId } })
  return NextResponse.json({ success: true })
}
