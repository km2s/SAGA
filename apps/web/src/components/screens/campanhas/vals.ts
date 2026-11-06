'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { CalendarDays, Check, Copy, Crown, LayoutGrid, List, MessagesSquare, NotebookPen, ScrollText, Settings, Users, type LucideIcon } from 'lucide-react'
import { dcHref } from '@/lib/dc-routes'

/** Dados reais de /campanhas (app/(app)/campanhas/page.tsx). */
export type CampanhasDados = {
  campanhas: {
    id: string; n: string; sys: string; mestre: boolean; freq: string; k: number
    live: { sessao: string; startedAt: string } | null
    ses: number; since: string; codigo: string | null; desc: string; archived: boolean
    personagemId: string | null
    members: { u: string; c: string; on: boolean }[]
  }[]
}

const AV = ['#b8492a', '#b98a2a', '#4f7a3a', '#6b5a8a', '#7a5a3a', '#3a6a7a']
const COVERS = ['linear-gradient(135deg,#2a1c08,#c9a22a)', 'linear-gradient(135deg,#0b0c11,#6a2817)', 'linear-gradient(135deg,#0e1a1c,#3a5a5a)', 'linear-gradient(135deg,#1a0c04,#d9662b)', 'linear-gradient(135deg,#1e1a14,#6a5a3a)']
const ICON: Record<string, LucideIcon> = { 'Painel do Mestre': Crown, 'Sessões': CalendarDays, 'NPCs': Users, 'Notas': NotebookPen, 'Mensagens': MessagesSquare, 'Configurar': Settings, 'Minha ficha': ScrollText }

export function useCampanhasVals(d: CampanhasDados) {
  const [role, setRole] = useState('Todas')
  const [st, setSt] = useState('Ativas')
  const [q, setQ] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [sel, setSel] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const tc = useRef<ReturnType<typeof setTimeout>>()
  // Horários no fuso do navegador: só depois de montar (o servidor está em outro fuso).
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true); return () => clearTimeout(tc.current) }, [])

  const all = d.campanhas.map((c, i) => ({
    ...c, idx: i, cover: COVERS[i % COVERS.length], slot: `camp-capa-${i}`, role: c.mestre ? 'Mestre' : 'Jogador',
    next: c.live ? 'Ao vivo agora' : c.archived ? `${c.ses} sessões` : '—', // TODO(api): próxima sessão agendada
  }))
  const qq = q.trim().toLowerCase()
  const list = all.filter(c => (st === 'Arquivadas') === c.archived && (role === 'Todas' || c.role === role) && (!qq || (c.n + c.sys).toLowerCase().includes(qq)))
  const selC = list.find(c => c.id === sel) ?? list[0]

  const seg = (arr: string[], cur: string, set: (v: string) => void) => arr.map(l => ({
    l, go: () => set(l), bg: cur === l ? 'var(--surface)' : 'transparent', color: cur === l ? 'var(--ink)' : 'var(--muted)', sh: cur === l ? '0 1px 2px rgb(0 0 0/.08)' : 'none',
  }))

  const camps = list.map((c, k) => ({
    ...c, init: c.n.replace(/^(A|O|Os|As) /, '')[0], delay: (k * 0.05).toFixed(2),
    roleBg: c.mestre ? 'var(--gold-t)' : 'var(--surface2)', roleColor: c.mestre ? 'color-mix(in oklab, var(--gold) 65%, var(--ink))' : 'var(--muted)',
    avs: c.members.slice(0, 3).map((m, j) => ({ i: m.u.charAt(0).toUpperCase(), bg: AV[(c.idx + j) % 6] })), more: c.k > 3 ? `+${c.k - 3}` : '',
    nextColor: c.live ? 'var(--accent)' : 'var(--muted)',
    ring: selC && selC.id === c.id ? '0 0 0 2px var(--accent), 0 16px 30px -20px rgb(60 30 10/.6)' : '0 10px 24px -20px rgb(60 30 10/.5)',
    rowBg: selC && selC.id === c.id ? 'var(--accent-t)' : 'transparent',
    go: () => { setSel(c.id); setCopied(false) },
  }))

  const gm = !!selC?.mestre
  const ctx = { campaignId: selC?.id, characterId: selC?.personagemId ?? undefined }
  const selV = selC ? {
    ...selC, isGM: gm && !selC.archived,
    stats: [{ v: selC.ses, l: 'sessões' }, { v: selC.k, l: 'jogadores' }, { v: selC.since, l: 'desde' }],
    nextKicker: selC.live ? '● Sessão em andamento' : selC.archived ? 'Crônica concluída' : 'Próxima sessão',
    nextTitle: selC.live ? selC.live.sessao : selC.archived ? 'O último sino tocou' : selC.ses ? `Sessão ${selC.ses + 1}` : 'Sessão de abertura',
    nextWhen: selC.live
      ? `${mounted ? `Iniciada às ${new Date(selC.live.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · ` : ''}${selC.members.filter(m => m.on).length} de ${selC.members.length} na mesa`
      : selC.next,
    nextColor: selC.live ? 'var(--accent)' : 'var(--muted)', nextBg: selC.live ? 'var(--accent-t)' : 'var(--surface2)', nextBorder: selC.live ? 'color-mix(in oklab, var(--accent) 35%, transparent)' : 'transparent',
    members: selC.members.map((m, j) => ({ u: m.u, c: m.c, i: m.u.charAt(0).toUpperCase(), bg: AV[(selC.idx + j) % 6], dot: m.on ? 'var(--ok)' : 'var(--line)', r: m.c === 'Mestre' ? 'Mestre' : '', roleColor: 'color-mix(in oklab, var(--gold) 70%, var(--ink))' })),
    code: selC.codigo ?? '—',
    actions: (gm ? ['Painel do Mestre', 'Sessões', 'NPCs', 'Notas', 'Mensagens', 'Configurar'] : ['Minha ficha', 'Sessões', 'Notas', 'Mensagens']).map(l => ({
      l, icon: ICON[l],
      href: dcHref(({
        'Painel do Mestre': 'SAGA Painel do Mestre.dc.html', 'Sessões': gm ? 'SAGA Painel do Mestre.dc.html?aba=sessoes' : 'SAGA Inicio v2.dc.html',
        'NPCs': 'SAGA Painel do Mestre.dc.html?aba=npcs', 'Notas': gm ? 'SAGA Painel do Mestre.dc.html?aba=notas' : 'SAGA Ficha.dc.html',
        'Configurar': 'SAGA Painel do Mestre.dc.html?aba=config', 'Mensagens': 'SAGA Mensagens.dc.html', 'Minha ficha': 'SAGA Ficha.dc.html',
      } as Record<string, string>)[l], ctx),
    })),
  } : null

  const nM = all.filter(c => !c.archived && c.mestre).length, nA = all.filter(c => !c.archived).length, nLive = all.filter(c => c.live).length
  return {
    $href: (link: string) => dcHref(link, ctx),
    // TODO(api): Campaign.coverUrl
    $img: (_id: string): string | null => null,
    summary: `${nA} ativas · ${nM} como mestre${nLive ? ` · ${nLive} ${nLive === 1 ? 'sessão acontecendo' : 'sessões acontecendo'} agora` : ''}`,
    roles: seg(['Todas', 'Mestre', 'Jogador'], role, setRole), states: seg(['Ativas', 'Arquivadas'], st, setSt),
    views: ([['grid', 'Grade', LayoutGrid], ['list', 'Lista', List]] as const).map(([k, l, icon]) => ({
      l, icon, go: () => setView(k), bg: view === k ? 'var(--surface)' : 'transparent', color: view === k ? 'var(--ink)' : 'var(--muted)', sh: view === k ? '0 1px 2px rgb(0 0 0/.08)' : 'none',
    })),
    q, onQ: (e: ChangeEvent<HTMLInputElement>) => setQ(e.target.value),
    isGrid: view === 'grid', isList: view === 'list', camps, empty: camps.length === 0,
    hasSel: !!selV, sel: selV!,
    copy: () => {
      if (!selV?.codigo) return
      try { void navigator.clipboard?.writeText(selV.codigo) } catch { /* sem clipboard */ }
      setCopied(true); clearTimeout(tc.current); tc.current = setTimeout(() => setCopied(false), 1800)
    },
    copyLabel: copied ? 'Copiado' : 'Copiar', copyIcon: copied ? Check : Copy, copyBg: copied ? 'var(--ok)' : 'var(--surface2)', copyColor: copied ? '#fff' : 'var(--ink)',
  }
}

export type Vals = ReturnType<typeof useCampanhasVals>
