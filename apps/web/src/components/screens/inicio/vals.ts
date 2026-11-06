'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Compass, Crown, Dice5, Map as MapIcon, MessagesSquare, Moon, ScrollText, Sparkles, UserRound, type LucideIcon } from 'lucide-react'
import { dcHref } from '@/lib/dc-routes'
import { roman } from '@/lib/roman'
import { toggleTema } from '@/lib/tema'
import { TOUR_ROLAR, avisarRolagem } from '@/lib/tour-store'

/** Dados reais do /dashboard (montados no servidor, app/(app)/dashboard/page.tsx). */
export type InicioDados = {
  nome: string
  aoVivo: {
    campaignId: string
    campanha: string
    sessao: string
    startedAt: string
    grupo: { n: string; hp: number; mx: number }[]
  } | null
  campanhas: { id: string; nome: string; sistema: string | null; sessoes: number; mestre: boolean; membros: string[]; aoVivo: boolean }[]
  inscricoes: { id: string; campaignId: string; who: string; camp: string; desc: string }[]
  personagens: { id: string; nome: string; campanha: string }[]
}

const AV = ['#b8492a', '#b98a2a', '#4f7a3a', '#6b5a8a', '#7a5a3a', '#3a6a7a']
const COVERS = ['linear-gradient(135deg,#2a1c08,#c9a22a)', 'linear-gradient(135deg,#0b0c11,#6a2817)', 'linear-gradient(135deg,#1a120c,#8f3a24)', 'linear-gradient(135deg,#1a0c04,#d9662b)', 'linear-gradient(135deg,#2e2318,#c9a22a)']
const p2 = (n: number) => String(n).padStart(2, '0')
const DIA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

type Res = { v: number; crit: boolean; fail: boolean }
type PalItem = { g: string; l: string; sub?: string; icon: LucideIcon; href?: string; act?: () => void }

/** Abre a paleta ⌘K a partir da busca do SagaHeader. */
export const ABRIR_PALETA = 'saga:abrir-paleta'

export function useInicioVals(d: InicioDados) {
  const router = useRouter()
  const [filtro, setFiltro] = useState<'Todas' | 'Mestre' | 'Jogador'>('Todas')
  const [now, setNow] = useState<Date | null>(null)
  const [apps, setApps] = useState<Record<string, 'ok' | 'no'>>({})
  const [face, setFace] = useState(20)
  const [rolling, setRolling] = useState(false)
  const [res, setRes] = useState<Res | null>(null)
  const [sides, setSides] = useState(20)
  const [pal, setPal] = useState(false)
  const [palQ, setPalQ] = useState('')
  const [palIdx, setPalIdx] = useState(0)
  const [day, setDay] = useState<number | null>(null)
  const palRef = useRef<HTMLInputElement>(null)
  const iv = useRef<ReturnType<typeof setInterval>>()
  const td = useRef<ReturnType<typeof setTimeout>>()

  // Relógio (data, saudação, cronômetro da sessão) só no cliente: o fuso do servidor não é o do usuário.
  useEffect(() => {
    setNow(new Date())
    const clock = setInterval(() => setNow(new Date()), 1000)
    const kd = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPal(p => !p); setPalQ(''); setPalIdx(0) }
    }
    // preventDefault avisa o header que a paleta abriu (ele tira o foco da busca).
    const abrir = (e: Event) => { e.preventDefault(); setPal(true); setPalQ(''); setPalIdx(0) }
    window.addEventListener('keydown', kd)
    window.addEventListener(ABRIR_PALETA, abrir)
    return () => { clearInterval(clock); clearInterval(iv.current); clearTimeout(td.current); window.removeEventListener('keydown', kd); window.removeEventListener(ABRIR_PALETA, abrir) }
  }, [])
  useEffect(() => { if (pal) setTimeout(() => palRef.current?.focus(), 30) }, [pal])

  const roll = (s: number) => {
    if (rolling) return
    setRolling(true); setSides(s); setRes(null)
    iv.current = setInterval(() => setFace(1 + Math.floor(Math.random() * s)), 60)
    // Com sessão ao vivo a rolagem vai para o log e o resultado é o do servidor.
    const live = d.aoVivo
    const servidor = live
      ? fetch(`/api/campaigns/${live.campaignId}/rolls`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expression: `1d${s}` }) })
          .then(r => (r.ok ? r.json() : null)).then((j: { total?: number } | null) => (typeof j?.total === 'number' ? j.total : null)).catch(() => null)
      : Promise.resolve(null)
    const espera = new Promise(r => { td.current = setTimeout(r, 900) })
    Promise.all([servidor, espera]).then(([total]) => {
      clearInterval(iv.current)
      const v = total ?? 1 + Math.floor(Math.random() * s)
      setRolling(false); setFace(v); setRes({ v, crit: s === 20 && v === 20, fail: s === 20 && v === 1 })
      avisarRolagem(s, v)
    })
  }

  // CTA "Rolar 1d20" do tour: rola aqui na rolagem rápida.
  const rollRef = useRef(roll)
  rollRef.current = roll
  useEffect(() => {
    const rolar = () => rollRef.current(20)
    window.addEventListener(TOUR_ROLAR, rolar)
    return () => window.removeEventListener(TOUR_ROLAR, rolar)
  }, [])

  const decidir = async (id: string, campaignId: string, ok: boolean) => {
    const r = await fetch(`/api/campaigns/${campaignId}/applications/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: ok ? 'approved' : 'rejected' }),
    }).catch(() => null)
    if (r?.ok || r?.status === 409) setApps(a => ({ ...a, [id]: ok ? 'ok' : 'no' }))
  }

  // ── Paleta ⌘K ──
  const P: PalItem[] = useMemo(() => [
    ...(d.aoVivo ? [{ g: 'Ações', l: `Entrar na mesa · ${d.aoVivo.campanha}`, sub: `${d.aoVivo.sessao} ao vivo`, icon: MapIcon, href: `/campaign/${d.aoVivo.campaignId}/mesa` }] : []),
    { g: 'Ações', l: 'Rolar 1d20', sub: 'Rolagem rápida', icon: Dice5, act: () => roll(20) },
    { g: 'Ações', l: 'Alternar tema claro/escuro', icon: Moon, act: toggleTema },
    { g: 'Ações', l: 'Rever os primeiros passos', sub: 'com Lorde Corvin', icon: Sparkles, href: '/dashboard?tour=1' },
    ...d.campanhas.map(c => ({
      g: 'Campanhas', l: c.nome, sub: [c.sistema, c.mestre ? 'Mestre' : 'Jogador', c.aoVivo ? 'ao vivo' : null].filter(Boolean).join(' · '),
      icon: c.mestre ? Crown : MapIcon, href: `/campaign/${c.id}`,
    })),
    ...d.personagens.map(p => ({ g: 'Personagens', l: p.nome, sub: p.campanha, icon: ScrollText, href: `/personagens/${p.id}` })),
    { g: 'Páginas', l: 'Explorar campanhas', icon: Compass, href: '/explorar' },
    { g: 'Páginas', l: 'Sistemas', icon: BookOpen, href: '/sistemas' },
    { g: 'Páginas', l: 'Mensagens', icon: MessagesSquare, href: '/mensagens' },
    { g: 'Páginas', l: 'Perfil e conexões', icon: UserRound, href: '/perfil' },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [d])
  const q = palQ.trim().toLowerCase()
  const f = P.filter(p => !q || `${p.l} ${p.sub ?? ''} ${p.g}`.toLowerCase().includes(q))
  const idx = Math.min(palIdx, Math.max(0, f.length - 1)), n = Math.max(1, f.length)
  const go = (it: PalItem) => () => { setPal(false); setPalQ(''); if (it.act) it.act(); else if (it.href) router.push(it.href) }

  // ── Semana atual (seg–dom) ──
  const hoje = now ?? new Date(0)
  const seg = new Date(hoje); seg.setHours(0, 0, 0, 0); seg.setDate(seg.getDate() - ((seg.getDay() + 6) % 7))
  const dias = Array.from({ length: 7 }, (_, i) => { const x = new Date(seg); x.setDate(seg.getDate() + i); return x })
  const hojeN = hoje.getDate()
  // TODO(api): sessões agendadas na agenda e nos pontos da semana. Hoje só a sessão ao vivo.
  const AG = d.aoVivo ? [{ d: hojeN, t: d.aoVivo.campanha, s: `${d.aoVivo.sessao} · ao vivo`, h: 'agora', c: 'var(--accent)' }] : []
  const sess: Record<number, string> = d.aoVivo ? { [hojeN]: 'var(--accent)' } : {}

  const t = d.aoVivo && now ? Math.max(0, Math.floor((now.getTime() - new Date(d.aoVivo.startedAt).getTime()) / 1000)) : 0
  const hora = hoje.getHours()
  const saudacao = `${hora >= 5 && hora < 12 ? 'Bom dia' : hora >= 12 && hora < 18 ? 'Boa tarde' : 'Boa noite'}, ${d.nome}`
  const dataLonga = now
    ? `${now.toLocaleDateString('pt-BR', { weekday: 'long' }).replace(/^./, c => c.toUpperCase())}, ${now.getDate()} de ${now.toLocaleDateString('pt-BR', { month: 'long' })} · Anno ${roman(now.getFullYear())}`
    : ''

  const r = res
  return {
    $href: (link: string) => dcHref(link, { campaignId: d.aoVivo?.campaignId }),
    // TODO(api): Campaign.coverUrl — sem capa fica o gradiente do design.
    $img: (_id: string): string | null => null,
    toggleTema,
    dataLonga, saudacaoCap: saudacao.charAt(0), saudacaoResto: saudacao.slice(1),
    aoVivo: d.aoVivo ? { titulo: d.aoVivo.sessao, sub: d.aoVivo.campanha, mesa: `/campaign/${d.aoVivo.campaignId}/mesa` } : null,
    timer: `${p2(Math.floor(t / 3600))}:${p2(Math.floor(t / 60) % 60)}:${p2(t % 60)}`,
    party: (d.aoVivo?.grupo ?? []).map(({ n, hp, mx }, i) => {
      const p = mx > 0 ? Math.round(hp / mx * 100) : 0
      return {
        n, i: n.charAt(0).toUpperCase(), hp: `${hp}/${mx} PV`, pct: p, bg: AV[i % AV.length],
        bar: p > 50 ? 'var(--ok)' : p > 25 ? 'var(--gold)' : 'var(--accent)',
        ring: i === 0 ? 'inset 0 0 0 2px rgb(255 230 180/.35), 0 0 0 2px var(--surface), 0 0 0 4px var(--gold)' : 'inset 0 0 0 2px rgb(255 230 180/.35)',
      }
    }),
    camps: d.campanhas.filter(c => filtro === 'Todas' || (filtro === 'Mestre') === c.mestre).map((c, i) => ({
      n: c.nome, sysProg: [c.sistema, c.sessoes ? `Sessão ${roman(c.sessoes)}` : null].filter(Boolean).join(' · '),
      role: c.mestre ? 'Mestre' : 'Jogador', href: `/campaign/${c.id}`,
      next: c.aoVivo ? 'Agora · ao vivo' : '—', slot: `inicio-capa-${i}`, cover: COVERS[i % COVERS.length], delay: (0.2 + i * 0.06).toFixed(2),
      roleBg: c.mestre ? 'var(--gold-t)' : 'var(--surface2)', roleColor: c.mestre ? 'color-mix(in oklab, var(--gold) 65%, var(--ink))' : 'var(--muted)',
      avs: c.membros.slice(0, 3).map((m, j) => ({ i: m.charAt(0).toUpperCase(), bg: AV[(i + j) % AV.length] })),
      more: c.membros.length > 3 ? `+${c.membros.length - 3}` : '',
      nextColor: c.aoVivo ? 'var(--accent)' : 'var(--ink)',
    })),
    filtros: (['Todas', 'Mestre', 'Jogador'] as const).map(x => ({
      label: x, go: () => setFiltro(x),
      bg: filtro === x ? 'var(--surface)' : 'transparent', color: filtro === x ? 'var(--ink)' : 'var(--muted)', sh: filtro === x ? '0 1px 2px rgb(0 0 0/.08)' : 'none',
    })),
    week: dias.map(x => {
      const n = x.getDate(), isHoje = !!now && n === hojeN
      return {
        w: DIA[x.getDay()], n, go: () => setDay(day === n ? null : n),
        bg: isHoje ? 'var(--accent)' : day === n ? 'var(--surface2)' : 'transparent', color: isHoje ? '#fff8f0' : 'var(--ink)',
        ring: day === n ? 'inset 0 0 0 1.5px var(--ink)' : 'none', dot: isHoje && sess[n] ? '#f3dc94' : (sess[n] ?? 'transparent'),
      }
    }),
    agenda: AG.filter(a => day == null || a.d === day), noAgenda: day != null && !AG.some(a => a.d === day),
    pal, palQ, palRef, palEmpty: f.length === 0,
    onPalQ: (e: ChangeEvent<HTMLInputElement>) => { setPalQ(e.target.value); setPalIdx(0) },
    onPalKey: (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setPalIdx((idx + 1) % n) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setPalIdx((idx - 1 + n) % n) }
      else if (e.key === 'Enter' && f[idx]) go(f[idx])()
      else if (e.key === 'Escape') setPal(false)
    },
    closePal: () => setPal(false), stop: (e: MouseEvent) => e.stopPropagation(),
    palItems: f.map((p, k) => ({
      ...p, sub: p.sub ?? '', hdr: k === 0 || f[k - 1].g !== p.g, hdrL: p.g,
      bg: k === idx ? 'var(--accent-t)' : 'transparent', enterOp: k === idx ? 1 : 0, go: go(p), hover: () => { if (palIdx !== k) setPalIdx(k) },
    })),
    apps: d.inscricoes.map(a => {
      const dd = apps[a.id]
      return {
        ...a, pending: !dd, decided: !!dd,
        res: dd === 'ok' ? 'Aceito · convite selado e enviado no Discord' : 'Inscrição recusada',
        seal: dd === 'ok' ? 'radial-gradient(circle at 35% 30%, #c95a3a, #b8492a 45%, #6e2210)' : 'radial-gradient(circle at 35% 30%, #9a8a72, #6e604c 50%, #3e352a)',
        resColor: dd === 'ok' ? 'var(--ok)' : 'var(--muted)',
        ok: () => decidir(a.id, a.campaignId, true), no: () => decidir(a.id, a.campaignId, false),
      }
    }),
    pendentes: `${d.inscricoes.filter(a => !apps[a.id]).length} pendentes`,
    face, dieAnim: rolling ? 'inicio-spin .9s cubic-bezier(.2,.7,.3,1) both' : 'none',
    result: r ? r.v : '—', resColor: r && r.crit ? 'var(--accent)' : 'var(--ink)',
    resDesc: rolling ? 'Rolando…' : r ? (r.crit ? `Crítico! 1d${sides}` : r.fail ? `Falha crítica · 1d${sides}` : `1d${sides}`) : 'Escolha um dado',
    dice: ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'].map(die => {
      const s = +die.slice(1), on = sides === s && !!r
      return { die, go: () => roll(s), bg: on ? 'var(--ink)' : 'var(--surface)', color: on ? 'var(--bg)' : 'var(--ink)' }
    }),
  }
}

export type Vals = ReturnType<typeof useInicioVals>
