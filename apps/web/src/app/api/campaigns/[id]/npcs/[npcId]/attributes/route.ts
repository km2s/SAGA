import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'

async function requireGM(campaignId: string, discordId: string) {
  return prisma.campaignMember.findFirst({
    where: { campaignId, user: { discordId }, role: 'GM' },
    include: { campaign: { include: { system: true } } },
  }).catch(() => null)
}

export async function POST(req: Request, { params }: { params: { id: string; npcId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gm = await requireGM(params.id, session.user.discordId)
  if (!gm) return NextResponse.json({ error: 'GM only' }, { status: 403 })

  const npc = await prisma.nPC.findFirst({ where: { id: params.npcId, campaignId: params.id } }).catch(() => null)
  if (!npc) return NextResponse.json({ error: 'NPC not found' }, { status: 404 })

  const body = await req.json() as { name?: string; value?: number; defaultDie?: string }
  if (!body.name?.trim()) return NextResponse.json({ error: 'Nome do atributo obrigatório' }, { status: 400 })
  if (body.value === undefined) return NextResponse.json({ error: 'Valor obrigatório' }, { status: 400 })

  let systemAttr = await prisma.systemAttribute.findFirst({
    where: { name: body.name.trim(), systemId: gm.campaign.systemId ?? '__none__' },
  }).catch(() => null)

  if (!systemAttr) {
    let system = gm.campaign.system
    if (!system) {
      system = await prisma.rPGSystem.create({
        data: { name: `${gm.campaign.name} (personalizado)` },
      })
      await prisma.campaign.update({
        where: { id: params.id },
        data: { systemId: system.id },
      }).catch(() => null)
    }
    systemAttr = await prisma.systemAttribute.create({
      data: { name: body.name.trim(), defaultDie: body.defaultDie ?? 'd20', systemId: system.id },
    })
  }

  const attr = await prisma.nPCAttribute.upsert({
    where: { npcId_attributeId: { npcId: params.npcId, attributeId: systemAttr.id } },
    update: { value: body.value },
    create: { npcId: params.npcId, attributeId: systemAttr.id, value: body.value },
    include: { attribute: true },
  })

  return NextResponse.json(attr, { status: 201 })
}

export async function DELETE(req: Request, { params }: { params: { id: string; npcId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gm = await requireGM(params.id, session.user.discordId)
  if (!gm) return NextResponse.json({ error: 'GM only' }, { status: 403 })

  const body = await req.json() as { npcAttributeId?: string }
  if (!body.npcAttributeId) return NextResponse.json({ error: 'npcAttributeId obrigatório' }, { status: 400 })

  await prisma.nPCAttribute.delete({ where: { id: body.npcAttributeId } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
