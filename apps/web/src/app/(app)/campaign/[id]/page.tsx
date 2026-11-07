import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { notFound, redirect } from 'next/navigation'
import { Painel } from '@/components/screens/painel/Painel'
import type { PainelDados } from '@/components/screens/painel/vals'
import { VisaoGeralAntiga } from '@/components/campaign/VisaoGeralAntiga'
import { MarkTutorialVisited } from '@/components/tutorial/MarkTutorialVisited'
import { freqLabel, ONLINE_MS } from '@/lib/campanha-labels'
import { parseTracks } from '@/lib/resource-tracks'
import { diaMes, duracao, haQuanto } from '@/lib/tempo'

const XP: Record<string, string> = { beginner: 'Iniciante', intermediate: 'Intermediário', advanced: 'Veterano' }
const NPC_TIPO: Record<string, string> = { VILLAIN: 'Vilão', ENEMY: 'Vilão', ALLY: 'Aliado', MERCHANT: 'Mercador', FAMILIAR: 'Familiar' }

export default async function CampaignPage({ params, searchParams }: { params: { id: string }; searchParams: { aba?: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const me = await prisma.campaignMember.findFirst({
    where: { campaignId: params.id, user: { discordId: session.user.discordId } },
    select: { role: true, userId: true },
  }).catch(() => null)
  if (!me) notFound()
  // O Painel do Mestre é só do mestre; jogadores seguem com a visão geral.
  if (me.role !== 'GM') return <VisaoGeralAntiga params={params} />

  const c = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: {
      system: { select: { id: true, name: true, isPreset: true } },
      members: {
        where: { role: 'PLAYER' }, orderBy: { joinedAt: 'asc' },
        select: { lastSeenAt: true, user: { select: { username: true } }, character: { select: { name: true, class: true, level: true, hp: true, maxHp: true } } },
      },
      sessions: { orderBy: { startedAt: 'asc' }, select: { id: true, name: true, isActive: true, startedAt: true, endedAt: true, summary: { select: { content: true } }, _count: { select: { rollLogs: true } } } },
      npcs: { orderBy: { createdAt: 'desc' }, select: { id: true, name: true, type: true, description: true, isPublic: true, imageUrl: true } },
      applications: { where: { status: 'pending' }, orderBy: { createdAt: 'asc' }, select: { id: true, characterDesc: true, experienceLevel: true, createdAt: true, user: { select: { username: true } } } },
      notes: { where: { authorId: me.userId }, orderBy: { updatedAt: 'desc' }, select: { id: true, title: true, content: true, visibility: true } },
    },
  }).catch(() => null)
  if (!c) notFound()

  const agora = Date.now()
  const live = c.sessions.find(s => s.isActive)
  const rolls = await prisma.rollLog.findMany({
    where: { session: { campaignId: c.id }, NOT: { expression: 'chat' } },
    orderBy: { rolledAt: 'desc' }, take: 5,
    select: { rolledBy: true, total: true, attribute: true, expression: true, rolledAt: true, session: { select: { name: true } } },
  }).catch(() => [])
  const totalRolls = c.sessions.reduce((n, s) => n + s._count.rollLogs, 0)
  const ms = c.sessions.reduce((n, s) => n + ((s.endedAt?.getTime() ?? (s.isActive ? agora : s.startedAt.getTime())) - s.startedAt.getTime()), 0)

  const feed = [
    ...rolls.map(r => ({ at: r.rolledAt, t: `${r.rolledBy} rolou ${r.total} em ${r.attribute ?? r.expression}`, w: `${haQuanto(r.rolledAt, agora)}${r.session.name ? ` · ${r.session.name}` : ''}`, c: 'var(--gold)' })),
    ...c.applications.map(a => ({ at: a.createdAt, t: `${a.user.username} se inscreveu pela Taverna`, w: haQuanto(a.createdAt, agora), c: '#3a6a7a' })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 5).map(({ t, w, c: cor }) => ({ t, w, c: cor }))

  const partes = [c.system?.name, freqLabel(c.campaignType, c.sessionFrequency)].filter(Boolean)
  const dados: PainelDados = {
    id: c.id,
    nome: c.name,
    heroLine: partes.length ? `${partes.join(' · ')} · ` : '',
    aoVivo: live ? live.name ?? `Sessão ${c.sessions.indexOf(live) + 1}` : null,
    proximaSessao: c.sessions.length + 1,
    party: c.members.map(m => ({
      u: m.user.username,
      c: m.character?.name ?? m.user.username,
      cls: m.character ? [m.character.class, `Nv ${m.character.level}`].filter(Boolean).join(' · ') : 'Sem personagem',
      hp: m.character?.hp ?? 0, mx: m.character?.maxHp ?? 0,
      on: !!m.lastSeenAt && agora - m.lastSeenAt.getTime() < ONLINE_MS,
    })),
    vagas: Math.max(c.maxSlots ?? 6, c.members.length),
    isOpen: c.isOpen,
    kpis: { sessoes: c.sessions.length, horas: `${Math.round(ms / 3600000)} h`, rolagens: totalRolls },
    feed,
    past: c.sessions.map((s, i) => ({
      id: s.id, n: i + 1, t: s.name ?? `Sessão ${i + 1}`, live: s.isActive,
      w: s.isActive ? 'hoje · ao vivo' : `${diaMes(s.startedAt)}${s.endedAt ? ` · ${duracao(s.endedAt.getTime() - s.startedAt.getTime())}` : ''}`,
      sum: s.summary?.content.slice(0, 220) ?? '',
    })).reverse(),
    npcs: c.npcs.map(n => ({ id: n.id, n: n.name, type: NPC_TIPO[n.type] ?? 'Neutro', d: n.description ?? '', vis: n.isPublic, img: n.imageUrl })),
    apps: c.applications.map(a => ({
      id: a.id, u: a.user.username, meta: `Experiência: ${XP[a.experienceLevel] ?? a.experienceLevel}`, msg: a.characterDesc,
      tags: [{ l: XP[a.experienceLevel] ?? a.experienceLevel, ok: a.experienceLevel !== 'beginner' }],
    })),
    notes: c.notes.map(n => ({ id: n.id, t: n.title ?? '', b: n.content, sec: n.visibility !== 'CAMPAIGN' })),
    tracks: parseTracks(c.resourceTracksJson),
    modelo: c.system ? { nome: c.system.name, preset: c.system.isPreset, sistemaId: c.system.isPreset ? null : c.system.id } : null,
    // TODO(api): nome do servidor e do canal do Discord ligados à campanha.
    botLine: c.guildId ? 'Lembretes e rolagens no servidor do Discord da campanha' : 'Nenhum servidor do Discord ligado à campanha',
  }

  return (
    <>
      <MarkTutorialVisited tutorialKey="saga_visited_gm" />
      <Painel dados={dados} aba={searchParams.aba ?? 'geral'} />
    </>
  )
}
