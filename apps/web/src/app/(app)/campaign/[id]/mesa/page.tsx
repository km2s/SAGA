import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { notFound, redirect } from 'next/navigation'
import { VirtualTable } from '@/components/mesa/VirtualTable'
import { resolveSheetCategory } from '@/lib/system-category'
import { parseResources, parseTracks, hasHpTrack } from '@/lib/resource-tracks'
import { Mesa } from '@/components/screens/mesa/Mesa'
import type { MesaDados } from '@/components/screens/mesa/vals'
import { MarkTutorialVisited } from '@/components/tutorial/MarkTutorialVisited'
import { leitor, mestreDa, ondeVisivel, serializarTodas } from '@/lib/rolagens'

// Ficha na Mesa: atributos, CA, armas e as notas da mesa (text field `mesa_notes`, como a Mesa antiga).
const fichaSel = {
  attributes: { select: { value: true, attribute: { select: { name: true, defaultDie: true } } } },
  weapons: { orderBy: { order: 'asc' as const }, select: { name: true, attackBonus: true, damage: true } },
  textFields: { where: { key: 'mesa_notes' }, select: { value: true } },
}
type Arma = { name: string; attackBonus: string | null; damage: string | null }
const armas = (ws: Arma[]) => ws.map(w => ({ n: w.name, b: parseInt(w.attackBonus ?? '0', 10) || 0, d: w.damage ?? '' }))
const ca = (attrs: { value: number; attribute: { name: string } }[]) => attrs.find(a => a.attribute.name === 'Classe de Armadura')?.value ?? null
const attrsDe = (attrs: { value: number; attribute: { name: string; defaultDie: string } }[]) => attrs.map(a => ({ n: a.attribute.name, v: a.value, die: a.attribute.defaultDie }))

async function MesaNovaPage({ id, discordId }: { id: string; discordId: string }) {
  const c = await prisma.campaign.findUnique({
    where: { id },
    select: {
      id: true, name: true, resourceTracksJson: true, system: { select: { name: true, category: true, isPreset: true } },
      members: {
        orderBy: { joinedAt: 'asc' },
        select: {
          id: true, role: true, user: { select: { username: true, discordId: true } },
          character: { select: { id: true, name: true, race: true, class: true, level: true, hp: true, maxHp: true, imageUrl: true, ...fichaSel } },
        },
      },
      sessions: { orderBy: { startedAt: 'asc' }, select: { id: true } },
    },
  }).catch(() => null)
  if (!c) notFound()
  const me = c.members.find(m => m.user.discordId === discordId)
  if (!me) notFound()
  const gm = me.role === 'GM'

  // Mesma sessão que a Mesa antiga restaura: a mais recente, ativa ou não.
  const s = await prisma.session.findFirst({
    where: { campaignId: id }, orderBy: { startedAt: 'desc' },
    select: { id: true, name: true, isActive: true, startedAt: true, tokensJson: true, musicYoutubeId: true, musicVolume: true, mapImageUrl: true, liveMembersJson: true },
  }).catch(() => null)
  const [rolls, total, npcs, handouts, views] = await Promise.all([
    s?.isActive ? prisma.rollLog.findMany({ where: { sessionId: s.id, ...ondeVisivel(me.id) }, orderBy: { rolledAt: 'desc' }, take: 50 }).catch(() => []) : [],
    s?.isActive ? prisma.rollLog.count({ where: { sessionId: s.id, NOT: { expression: 'chat' }, ...ondeVisivel(me.id) } }).catch(() => 0) : 0,
    gm ? prisma.nPC.findMany({ where: { campaignId: id }, orderBy: { name: 'asc' }, select: { id: true, name: true, type: true, hp: true, maxHp: true, imageUrl: true, ...fichaSel } }).catch(() => []) : [],
    prisma.handout.findMany({ where: { campaignId: id }, orderBy: { createdAt: 'desc' }, include: { sharedBy: { select: { user: { select: { username: true } } } } } }).catch(() => []),
    prisma.handoutView.findMany({ where: { handout: { campaignId: id } }, select: { handoutId: true, memberId: true } }).catch(() => []),
  ])
  const n = s ? c.sessions.findIndex(x => x.id === s.id) + 1 : 0

  const dados: MesaDados = {
    campaignId: c.id, campanha: c.name, souMestre: gm, meuId: me.id,
    categoria: resolveSheetCategory(c.system), temPv: hasHpTrack(parseTracks(c.resourceTracksJson)),
    sessao: s ? {
      id: s.id, nome: s.name ?? `Sessão ${n}`, numero: n, ativa: s.isActive, inicio: s.startedAt.toISOString(),
      tokensJson: s.tokensJson, mapa: s.mapImageUrl, musica: s.musicYoutubeId, volume: s.musicVolume, liveJson: s.liveMembersJson,
    } : null,
    membros: c.members.map(m => {
      // Armas e notas só para o dono e o mestre (mesma regra de /api/characters/[id]/full).
      const privado = gm || m.id === me.id
      return {
        id: m.id, role: m.role, u: m.user.username,
        char: m.character ? {
          id: m.character.id, n: m.character.name, raca: m.character.race, classe: m.character.class, nivel: m.character.level,
          hp: m.character.hp, max: m.character.maxHp, img: m.character.imageUrl, ca: ca(m.character.attributes),
          attrs: attrsDe(m.character.attributes),
          armas: privado ? armas(m.character.weapons) : null,
          nota: privado ? m.character.textFields[0]?.value ?? '' : null,
        } : null,
      }
    }),
    npcs: npcs.map(x => ({ id: x.id, n: x.name, type: x.type, hp: x.hp, max: x.maxHp, img: x.imageUrl, ca: ca(x.attributes), attrs: attrsDe(x.attributes), armas: armas(x.weapons), nota: x.textFields[0]?.value ?? '' })),
    handouts: handouts.map(h => ({
      id: h.id, t: h.title, x: h.content, img: h.imageUrl, at: h.createdAt.toISOString(), por: h.sharedBy.user.username,
      // Jogador só sabe se ele mesmo viu.
      vistos: views.filter(v => v.handoutId === h.id && (gm || v.memberId === me.id)).map(v => v.memberId),
    })),
    // Rolagens privadas: o resultado só vem para quem pode ver (lib/rolagens.ts).
    rolagens: serializarTodas(rolls, leitor(me, me.user.username), (() => { const m = c.members.find(x => x.role === 'GM'); return { memberId: m?.id ?? null, username: m?.user.username ?? null } })()),
    totalRolagens: total,
  }
  return (
    <>
      <MarkTutorialVisited tutorialKey="saga_visited_mesa" />
      <Mesa dados={dados} />
    </>
  )
}
export default async function VirtualTablePage({ params, searchParams }: { params: { id: string }; searchParams: { antiga?: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  // A Mesa do redesign é a padrão; a antiga fica em ?antiga=1 por um tempo, como reserva.
  if (searchParams.antiga !== '1') return <MesaNovaPage id={params.id} discordId={session.user.discordId} />


  const membership = await prisma.campaignMember.findFirst({
    where: {
      campaignId: params.id,
      user: { discordId: session.user.discordId },
    },
  }).catch(() => null)

  if (!membership) notFound()

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      resourceTracksJson: true,
      system: { select: { name: true, category: true, isPreset: true } },
    },
  }).catch(() => null)

  if (!campaign) notFound()

  const members = await prisma.campaignMember.findMany({
    where: { campaignId: params.id },
    include: {
      user: { select: { username: true } },
      character: {
        select: {
          id: true,
          name: true,
          race: true,
          class: true,
          level: true,
          hp: true,
          maxHp: true,
          resourcesJson: true,
          imageUrl: true,
          attributes: {
            include: {
              attribute: { select: { name: true, defaultDie: true } },
            },
            orderBy: { attribute: { name: 'asc' } },
          },
        },
      },
    },
    orderBy: { role: 'asc' },
  }).catch(() => [])

  // Carrega a sessão mais recente (ativa ou encerrada) para restaurar o estado do canvas
  const activeSession = await prisma.session.findFirst({
    where: { campaignId: params.id },
    orderBy: { startedAt: 'desc' },
    select: { id: true, name: true, isActive: true, tokensJson: true, musicYoutubeId: true, musicVolume: true, mapImageUrl: true, liveMembersJson: true },
  }).catch(() => null)

  // Roll logs apenas da sessão ativa — sessões encerradas não precisam de logs em tempo real
  const initialRolls = activeSession?.isActive
    ? await prisma.rollLog.findMany({
        where: { sessionId: activeSession.id, ...ondeVisivel(membership.id) },
        orderBy: { rolledAt: 'desc' },
        take: 30,
      }).catch(() => [])
    : []

  const isGM = membership.role === 'GM'

  const npcs = isGM
    ? await prisma.nPC.findMany({
        where: { campaignId: params.id },
        select: {
          id: true,
          name: true,
          type: true,
          race: true,
          class: true,
          level: true,
          hp: true,
          maxHp: true,
          resourcesJson: true,
          imageUrl: true,
          attributes: {
            include: { attribute: { select: { name: true, defaultDie: true } } },
            orderBy: { attribute: { name: 'asc' } },
          },
        },
        orderBy: { name: 'asc' },
      }).catch(() => [])
    : []

  const serializedNpcs = npcs.map(n => ({
    id: n.id,
    name: n.name,
    type: n.type,
    race: n.race,
    class: n.class,
    level: n.level,
    hp: n.hp,
    maxHp: n.maxHp,
    resources: parseResources(n.resourcesJson),
    imageUrl: n.imageUrl,
    attributes: n.attributes.map(a => ({
      id: a.id,
      value: a.value,
      name: a.attribute.name,
      defaultDie: a.attribute.defaultDie,
    })),
  }))

  const serializedRolls = serializarTodas(initialRolls, leitor(membership, session.user.username), await mestreDa(params.id))

  const serializedMembers = members.map(m => ({
    id: m.id,
    role: m.role as string,
    user: { username: m.user.username },
    character: m.character
      ? {
          id: m.character.id,
          name: m.character.name,
          race: m.character.race,
          class: m.character.class,
          level: m.character.level,
          hp: m.character.hp,
          maxHp: m.character.maxHp,
          resources: parseResources(m.character.resourcesJson),
          imageUrl: m.character.imageUrl,
          attributes: m.character.attributes.map(a => ({
            id: a.id,
            value: a.value,
            name: a.attribute.name,
            defaultDie: a.attribute.defaultDie,
          })),
        }
      : null,
  }))

  return (
    <VirtualTable
      campaign={{ id: campaign.id, name: campaign.name }}
      activeSession={activeSession}
      members={serializedMembers}
      npcs={serializedNpcs}
      initialRolls={serializedRolls}
      isGM={isGM}
      currentMemberId={membership.id}
      systemName={campaign.system?.name ?? null}
      systemCategory={resolveSheetCategory(campaign.system)}
      resourceTracks={parseTracks(campaign.resourceTracksJson)}
    />
  )
}
