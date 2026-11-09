import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { codigoValido, normalizar, proximasDe, rotuloAgenda, rotuloData } from '@/lib/convite'
import { freqLabel } from '@/lib/campanha-labels'
import { safeImageUrl } from '@/lib/safe-url'
import { mandarDm } from '@/lib/discord-notify'

const TOM: Record<string, string> = { epic: 'Épico', dark: 'Sombrio', horror: 'Terror', political: 'Político', adventure: 'Aventura', lighthearted: 'Leve' }

async function campanhaDo(codigo: string) {
  const c = normalizar(codigo)
  if (!codigoValido(c)) return null
  return prisma.campaign.findFirst({
    where: { inviteCode: c, archivedAt: null },
    select: {
      id: true, name: true, description: true, coverUrl: true, campaignType: true, sessionFrequency: true, contentTone: true, maxSlots: true, systemId: true,
      system: { select: { name: true } },
      members: { orderBy: { joinedAt: 'asc' }, select: { role: true, userId: true, user: { select: { username: true, discordId: true } }, character: { select: { name: true, class: true } } } },
    },
  }).catch(() => null)
}

/**
 * Busca a mesa pelo código (SAGA Convite). `personagens` = fichas do usuário no
 * mesmo sistema, em outras campanhas, que podem ser levadas para esta.
 */
export async function GET(_req: Request, { params }: { params: { codigo: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rl = applyRateLimit(`convite:${session.user.discordId}`, RATE_LIMITS.convite)
  if (rl) return rl
  const c = await campanhaDo(params.codigo)
  if (!c) return NextResponse.json({ error: 'Nenhuma mesa com esse código' }, { status: 404 })

  const user = await prisma.user.findUnique({ where: { discordId: session.user.discordId }, select: { id: true } })
  const fichas = user && c.systemId ? await prisma.characterSheet.findMany({
    where: { member: { userId: user.id, campaignId: { not: c.id }, campaign: { systemId: c.systemId } } },
    orderBy: { updatedAt: 'desc' }, take: 6,
    select: { id: true, name: true, class: true, level: true, member: { select: { campaign: { select: { name: true } } } } },
  }).catch(() => []) : []
  const prox = (await proximasDe([c.id])).get(c.id)
  const gm = c.members.find(m => m.role === 'GM')
  const jogadores = c.members.filter(m => m.role !== 'GM')

  return NextResponse.json({
    campanha: {
      id: c.id, n: c.name, sys: c.system?.name ?? 'Sistema livre', fmt: freqLabel(c.campaignType, c.sessionFrequency),
      gm: gm?.user.username ?? 'Mestre', when: prox ? rotuloAgenda(prox) : 'A combinar', next: prox ? rotuloData(prox) : 'A combinar',
      tone: (c.contentTone && TOM[c.contentTone]) || c.contentTone || '—',
      taken: jogadores.length, tot: Math.max(c.maxSlots ?? 6, jogadores.length + 1), d: c.description ?? '',
      members: jogadores.map(m => ({ u: m.user.username, t: m.character ? [m.character.name, m.character.class].filter(Boolean).join(', ') : 'sem personagem' })),
      jaMembro: !!user && c.members.some(m => m.userId === user.id),
      capa: safeImageUrl(c.coverUrl),
    },
    personagens: fichas.map(f => ({ id: f.id, t: f.name, d: [f.class, `Nv ${f.level}`, `de ${f.member.campaign.name}`].filter(Boolean).join(' · ') })),
  })
}

/** Entra na mesa: `{ personagem: <id> | 'new' | 'later' }`. Com `<id>`, uma cópia da ficha vai junto. */
export async function POST(req: Request, { params }: { params: { codigo: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rl = applyRateLimit(`convite:${session.user.discordId}`, RATE_LIMITS.convite)
  if (rl) return rl
  const c = await campanhaDo(params.codigo)
  if (!c) return NextResponse.json({ error: 'Nenhuma mesa com esse código' }, { status: 404 })
  const user = await prisma.user.findUnique({ where: { discordId: session.user.discordId }, select: { id: true } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (c.members.some(m => m.userId === user.id)) return NextResponse.json({ error: 'Você já faz parte desta mesa', campaignId: c.id }, { status: 409 })
  const jogadores = c.members.filter(m => m.role !== 'GM').length
  if (c.maxSlots && jogadores >= c.maxSlots) return NextResponse.json({ error: 'A mesa está completa' }, { status: 409 })

  const b = await req.json().catch(() => ({})) as { personagem?: string }
  const origem = b.personagem && b.personagem !== 'new' && b.personagem !== 'later'
    ? await prisma.characterSheet.findFirst({
        where: { id: b.personagem, member: { userId: user.id, campaign: { systemId: c.systemId ?? '__nenhum__' } } },
        include: { attributes: true, textFields: true, weapons: true, spellSlots: true },
      }).catch(() => null)
    : null

  const member = await prisma.campaignMember.create({ data: { userId: user.id, campaignId: c.id, role: 'PLAYER' } }).catch(() => null)
  if (!member) return NextResponse.json({ error: 'Você já faz parte desta mesa', campaignId: c.id }, { status: 409 })
  if (origem) {
    await prisma.characterSheet.create({
      data: {
        memberId: member.id, name: origem.name, race: origem.race, class: origem.class, level: origem.level, imageUrl: origem.imageUrl,
        hp: origem.hp, maxHp: origem.maxHp, isPublic: origem.isPublic, sheetSystemId: origem.sheetSystemId, resourcesJson: origem.resourcesJson,
        attributes: { create: origem.attributes.map(a => ({ attributeId: a.attributeId, value: a.value, customDie: a.customDie })) },
        // As notas da mesa antiga ficam para trás.
        textFields: { create: origem.textFields.filter(t => t.key !== 'mesa_notes').map(t => ({ key: t.key, label: t.label, value: t.value, order: t.order })) },
        weapons: { create: origem.weapons.map(w => ({ name: w.name, attackBonus: w.attackBonus, damage: w.damage, damageType: w.damageType, range: w.range, properties: w.properties, order: w.order })) },
        spellSlots: { create: origem.spellSlots.map(s => ({ level: s.level, total: s.total, used: 0 })) },
      },
    }).catch(() => null)
  }
  // Avisa o mestre por DM (se o bot puder falar com ele).
  const gm = c.members.find(m => m.role === 'GM')
  if (gm) void mandarDm(gm.user.discordId, `🎲 ${session.user.username} entrou em **${c.name}** pelo código de convite${origem ? ` com ${origem.name}` : ''}.`)
  return NextResponse.json({ campaignId: c.id }, { status: 201 })
}
