import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; attrId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { value?: number; customDie?: string }

  const data: Record<string, unknown> = {}
  if (body.value !== undefined) {
    if (typeof body.value !== 'number' || !isFinite(body.value)) {
      return NextResponse.json({ error: 'value inválido' }, { status: 400 })
    }
    data.value = Math.max(-999, Math.min(999, Math.round(body.value)))
  }
  if (body.customDie !== undefined) {
    data.customDie = body.customDie === null ? null : String(body.customDie).slice(0, 20) || null
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  // Try CharacterAttribute first
  const charAttr = await prisma.characterAttribute.findUnique({
    where: { id: params.attrId },
    include: { sheet: { include: { member: { include: { user: true } } } } },
  }).catch(() => null)

  if (charAttr) {
    const isMine = charAttr.sheet.member.user.discordId === session.user.discordId
    const isGM = await prisma.campaignMember.findFirst({
      where: { campaignId: charAttr.sheet.member.campaignId, user: { discordId: session.user.discordId }, role: 'GM' },
    })
    if (!isMine && !isGM) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const updated = await prisma.characterAttribute.update({
      where: { id: params.attrId },
      data,
      include: { attribute: true },
    })
    return NextResponse.json(updated)
  }

  // Fallback: NPCAttribute — only GMs can edit
  const npcAttr = await prisma.nPCAttribute.findUnique({
    where: { id: params.attrId },
    include: { npc: true },
  }).catch(() => null)

  if (!npcAttr) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isGM = await prisma.campaignMember.findFirst({
    where: { campaignId: npcAttr.npc.campaignId, user: { discordId: session.user.discordId }, role: 'GM' },
  })
  if (!isGM) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const updated = await prisma.nPCAttribute.update({
    where: { id: params.attrId },
    data,
    include: { attribute: true },
  })
  return NextResponse.json(updated)
}
