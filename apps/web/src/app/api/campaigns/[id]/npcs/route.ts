import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'
import { mergedAttributesFrom, sanitizeSystemIds } from '@/lib/system-clone'

function attrDefault(description: string | null): number {
  const d = description?.trim() ?? ''
  if (
    d.startsWith('Talento') || d.startsWith('Perícia') || d.startsWith('Conhecimento') ||
    d.startsWith('Habilidade') || d.startsWith('Disciplina') || d.startsWith('Antecedente')
  ) return 0
  if (d.startsWith('Virtude')) return 1
  return 1
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gmMember = await prisma.campaignMember.findFirst({
    where: { campaignId: params.id, user: { discordId: session.user.discordId }, role: 'GM' },
  }).catch(() => null)
  if (!gmMember) return NextResponse.json({ error: 'GM only' }, { status: 403 })

  const body = await req.json() as {
    name?: string; description?: string; imageUrl?: string; type?: string
    race?: string; class?: string; level?: number; hp?: number; maxHp?: number
    isPublic?: boolean; linkedMemberId?: string; templateSystemIds?: string[]
  }

  if (!body.name?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const imageUrl = body.imageUrl?.trim() || null
  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
    return NextResponse.json({ error: 'imageUrl inválida' }, { status: 400 })
  }

  let linkedMemberId: string | null = null
  if (body.linkedMemberId) {
    const linked = await prisma.campaignMember.findFirst({
      where: { id: body.linkedMemberId, campaignId: params.id },
    }).catch(() => null)
    if (!linked) return NextResponse.json({ error: 'Membro vinculado não encontrado nesta campanha' }, { status: 400 })
    linkedMemberId = linked.id
  }

  const npc = await prisma.nPC.create({
    data: {
      name: body.name.trim().slice(0, 100),
      description: body.description?.trim().slice(0, 500) || null,
      imageUrl,
      type: body.type ?? 'NEUTRAL',
      race: body.race?.trim() || null,
      class: body.class?.trim() || null,
      level: typeof body.level === 'number' ? Math.max(1, Math.min(100, body.level)) : 1,
      hp: typeof body.hp === 'number' ? Math.max(0, body.hp) : 10,
      maxHp: typeof body.maxHp === 'number' ? Math.max(1, body.maxHp) : 10,
      isPublic: body.isPublic ?? false,
      campaignId: params.id,
      linkedMemberId,
    },
    include: { linkedMember: { include: { user: true } }, visibilities: true },
  })

  // Template da ficha: por padrão o NPC herda os atributos do sistema da
  // campanha; o GM pode escolher outro(s) sistema(s) como modelo (ex.: NPC só
  // de Vampiro V20, só de Lobisomem, ou a mistura, numa campanha homebrew).
  const templateIds = sanitizeSystemIds(body.templateSystemIds)
  if (templateIds.length > 0) {
    const merged = await mergedAttributesFrom(templateIds)
    if (merged.length > 0) {
      await prisma.nPCAttribute.createMany({
        data: merged.map(a => ({
          npcId: npc.id,
          attributeId: a.id,
          value: attrDefault(a.description ?? null),
        })),
        skipDuplicates: true,
      }).catch(() => null)
    }
    return NextResponse.json(npc, { status: 201 })
  }

  // Seed system attributes, exactly like character creation does
  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: { system: { include: { attributes: true } } },
  }).catch(() => null)

  if (campaign?.system?.attributes && campaign.system.attributes.length > 0) {
    await prisma.nPCAttribute.createMany({
      data: campaign.system.attributes.map(a => ({
        npcId: npc.id,
        attributeId: a.id,
        value: attrDefault(a.description ?? null),
      })),
      skipDuplicates: true,
    }).catch(() => null)
  }

  return NextResponse.json(npc, { status: 201 })
}
