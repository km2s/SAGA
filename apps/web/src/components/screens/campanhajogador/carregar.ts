import { prisma } from 'database'
import { ONLINE_MS } from '@/lib/campanha-labels'
import { hasHpTrack, parseTracks } from '@/lib/resource-tracks'
import { roman } from '@/lib/roman'
import { haQuanto } from '@/lib/tempo'
import { proximasDe, rotuloData } from '@/lib/convite'
import type { CampanhaJogadorDados } from './vals'

// Primeiro parágrafo do resumo (sem os títulos "#").
const trecho = (t: string | null | undefined) => (t ?? '').split('\n').map(l => l.trim()).find(l => l && !l.startsWith('#')) ?? ''

/** Dados de /campaign/[id] na visão do jogador (SAGA Campanha Jogador). */
export async function carregarCampanhaJogador(campaignId: string, memberId: string): Promise<CampanhaJogadorDados | null> {
  const c = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true, name: true, description: true, coverUrl: true, resourceTracksJson: true, system: { select: { name: true } },
      members: { orderBy: { joinedAt: 'asc' }, select: { id: true, role: true, lastSeenAt: true, user: { select: { username: true } }, character: { select: { id: true, name: true, race: true, class: true, level: true, hp: true, maxHp: true, imageUrl: true } } } },
      sessions: { orderBy: { startedAt: 'asc' }, select: { id: true, name: true, isActive: true, startedAt: true, endedAt: true, summary: { select: { content: true } } } },
      handouts: { orderBy: { createdAt: 'desc' }, take: 6, select: { title: true, imageUrl: true, seenBy: { where: { memberId }, select: { id: true } } } },
    },
  }).catch(() => null)
  if (!c) return null
  const eu = c.members.find(m => m.id === memberId)
  const agora = Date.now()
  const live = c.sessions.find(s => s.isActive)
  const ch = eu?.character
  const prox = (await proximasDe([c.id])).get(c.id)
  return {
    campaignId: c.id, campanha: c.name, descricao: c.description ?? '', sistema: c.system?.name ?? null,
    mestre: c.members.find(m => m.role === 'GM')?.user.username ?? null,
    aoVivo: live ? { nome: live.name ?? `Sessão ${roman(c.sessions.indexOf(live) + 1)}` } : null,
    capa: c.coverUrl, proxima: prox ? `${prox.titulo} · ${rotuloData(prox)}` : null,
    pers: ch ? { id: ch.id, n: ch.name, sub: [ch.race, ch.class, `Nível ${ch.level}`].filter(Boolean).join(' · '), hp: ch.hp, max: ch.maxHp, img: ch.imageUrl } : null,
    temPv: hasHpTrack(parseTracks(c.resourceTracksJson)),
    sessoes: c.sessions.map((s, i) => ({ s, i })).filter(x => !x.s.isActive).reverse().slice(0, 3).map(({ s, i }) => ({
      id: s.id, num: roman(i + 1), n: s.name ?? s.summary?.content.match(/^# (.+)$/m)?.[1] ?? `Sessão ${i + 1}`,
      d: trecho(s.summary?.content) || 'Sem resumo ainda.', w: haQuanto(s.endedAt ?? s.startedAt, agora),
    })),
    handouts: c.handouts.map(h => ({ t: h.title || 'Handout sem título', img: h.imageUrl, novo: h.seenBy.length === 0 })),
    companhia: c.members.filter(m => m.role !== 'GM').map(m => ({
      c: m.character?.name ?? '(sem personagem)', u: m.user.username,
      online: m.id === memberId || (!!m.lastSeenAt && agora - m.lastSeenAt.getTime() < ONLINE_MS),
    })),
  }
}
