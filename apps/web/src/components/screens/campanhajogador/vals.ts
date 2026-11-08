'use client'

import { CalendarDays, MessagesSquare, NotebookPen, Users } from 'lucide-react'
import { dcHref } from '@/lib/dc-routes'
import { safeImageUrl } from '@/lib/safe-url'

/** Dados reais de /campaign/[id] para o jogador (o mestre vê o Painel). */
export type CampanhaJogadorDados = {
  campaignId: string; campanha: string; descricao: string; sistema: string | null; mestre: string | null
  aoVivo: { nome: string } | null
  pers: null | { id: string; n: string; sub: string; hp: number; max: number; img: string | null }
  temPv: boolean
  sessoes: { id: string; num: string; n: string; d: string; w: string }[]
  handouts: { t: string; img: string | null; novo: boolean }[]
  companhia: { c: string; u: string; online: boolean }[]
}

const AVS = ['linear-gradient(135deg,#3a6a4a,#1e3a28)', 'linear-gradient(135deg,#7a4a14,#3a2208)', 'linear-gradient(135deg,#5a1a2e,#2a0a16)', 'linear-gradient(135deg,#6a5a3a,#2e2618)']
const CARTA = 'repeating-linear-gradient(180deg, transparent 0 13px, rgb(120 80 30/.18) 13px 14px), linear-gradient(160deg,#f6ead0,#e2cfa4)'

export function useCampanhaJogadorVals(d: CampanhaJogadorDados) {
  const base = `/campaign/${d.campaignId}`
  const p = d.pers
  const pct = p && p.max > 0 ? Math.max(0, Math.min(100, Math.round(p.hp / p.max * 100))) : 0
  return {
    $href: (link: string) => dcHref(link, { campaignId: d.campaignId }),
    capa: null as string | null, // TODO(api): Campaign.coverUrl
    linhaSis: [d.sistema ?? 'Sistema próprio', d.mestre ? `Mestre ${d.mestre}` : null].filter(Boolean).join(' · '),
    campanha: d.campanha, descricao: d.descricao,
    live: !!d.aoVivo, notLive: !d.aoVivo,
    aoVivoLabel: d.aoVivo ? `${d.aoVivo.nome} ao vivo · Entrar na mesa` : '',
    mesaHref: `${base}/mesa`,
    proxima: 'A combinar', // TODO(api): agendamento de sessões
    pers: {
      i: (p?.n[0] ?? '?').toUpperCase(), img: safeImageUrl(p?.img ?? null), n: p?.n ?? 'Sem personagem',
      sub: p?.sub ?? 'Você ainda não tem ficha nesta campanha.',
      temHp: !!p && d.temPv && p.max > 0, hpTxt: p ? `${p.hp}/${p.max} PV` : '', pct, hpC: pct > 50 ? 'var(--ok)' : pct > 25 ? '#d9a22a' : 'var(--blood)',
      temFicha: !!p, href: p ? `/personagens/${p.id}` : '#',
    },
    sess: d.sessoes.map(s => ({ ...s, href: `${base}/sessions/${s.id}` })),
    sessoesHref: `${base}/sessions`, membrosHref: `${base}/members`,
    semHands: d.handouts.length === 0,
    hands: d.handouts.map(h => {
      const img = safeImageUrl(h.img)
      return { t: h.t, isNew: h.novo, ring: h.novo ? 'var(--accent)' : 'var(--line)', sh: h.novo ? '0 0 0 3px var(--accent-t)' : 'none', art: img ? `url("${img.replace(/["\\]/g, '')}") center/cover, #2a1c10` : CARTA }
    }),
    party: d.companhia.map((m, k) => ({ c: m.c, u: m.u, i: (m.u[0] ?? '?').toUpperCase(), av: AVS[k % AVS.length]!, dot: m.online ? 'var(--ok)' : 'var(--line)' })),
    links: [
      [`${base}/notes`, NotebookPen, 'Notas da campanha', 'Suas notas e as da companhia'],
      [`${base}/sessions`, CalendarDays, 'Sessões', 'Resumos e rolagens de cada noite'],
      [`${base}/npcs`, Users, 'NPCs revelados', 'Quem o Mestre já apresentou'],
      [`/mensagens?campanha=${d.campaignId}`, MessagesSquare, 'Mensagens', 'Canal da campanha e sussurros'],
    ].map(([href, icon, l, dd]) => ({ href: href as string, icon: icon as typeof Users, l: l as string, d: dd as string })),
  }
}

export type Vals = ReturnType<typeof useCampanhaJogadorVals>
