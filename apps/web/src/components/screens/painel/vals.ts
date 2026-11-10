'use client'

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, Check, Copy, Dices, Eye, EyeOff, Hourglass, LayoutDashboard, Mail, Map as MapIcon, NotebookPen, Radio, Settings, Users, type LucideIcon } from 'lucide-react'
import type { MapaItem } from '@/components/screens/sagamapas/vals'
import { dcHref } from '@/lib/dc-routes'
import { roman } from '@/lib/roman'

/** Dados reais do Painel do Mestre (app/(app)/campaign/[id]/page.tsx, só para o mestre). */
export type PainelDados = {
  /** Mapas da campanha (SAGA Mapas) e o que está na mesa. */
  mapas: MapaItem[]; naMesa: string
  id: string; nome: string; heroLine: string
  aoVivo: string | null; proximaSessao: number
  party: { u: string; c: string; cls: string; hp: number; mx: number; on: boolean }[]
  vagas: number; isOpen: boolean
  kpis: { sessoes: number; horas: string; rolagens: number }
  feed: { t: string; w: string; c: string }[]
  past: { id: string; n: number; t: string; w: string; sum: string; live: boolean }[]
  npcs: { id: string; n: string; type: string; d: string; vis: boolean; img: string | null }[]
  apps: { id: string; u: string; meta: string; msg: string; tags: { l: string; ok: boolean }[] }[]
  notes: { id: string; t: string; b: string; sec: boolean }[]
  tracks: { key: string; label: string; color: string }[]
  modelo: { nome: string; preset: boolean; sistemaId: string | null } | null
  botLine: string
  /** Código de convite XXXX-XXXX, fios soltos, agenda, quem vê as rolagens, bot e capa. */
  codigo: string | null; fios: Fio[]; agendadas: Agendada[]
  rolagens: 'todos' | 'mestre' | 'escolha'; bot: boolean; capa: string | null
}

// Tipos de NPC do design → valores do banco (components/gm/CreateNPCModal.tsx).
const NPC_TIPO: Record<string, string> = { 'Vilão': 'VILLAIN', 'Aliado': 'ALLY', 'Mercador': 'MERCHANT', 'Familiar': 'FAMILIAR', 'Neutro': 'NEUTRAL' }
const NPCC: Record<string, string> = { 'Vilão': '#8a1c24', 'Aliado': '#4f7a3a', 'Mercador': '#b98a2a', 'Familiar': '#6b5a8a', 'Neutro': '#76695a' }
const COV = ['linear-gradient(135deg,#2a1c08,#8f3a24)', 'linear-gradient(135deg,#1a120c,#5c4410)', 'linear-gradient(135deg,#1a0c04,#6a2817)', 'linear-gradient(135deg,#1e1a14,#6a5a3a)']
const AV = ['#b8492a', '#b98a2a', '#4f7a3a', '#6b5a8a', '#7a5a3a', '#3a6a7a']
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'], DOW = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
// Quem vê as rolagens dos jogadores (Campaign.rollVisibility).
const ROLV: Record<string, string> = { todos: 'Todos', mestre: 'Só o mestre', escolha: 'Cada um escolhe' }
const ROLV_API: Record<string, string> = { 'Todos': 'todos', 'Só o mestre': 'mestre', 'Cada um escolhe': 'escolha' }
// Barras do design → chaves de lib/resource-tracks.ts.
const TRK_BASE: [string, string, string, string][] = [['hp', 'Pontos de vida', 'var(--ok)', 'vida'], ['pe', 'Pontos de esforço', 'var(--gold)', 'esforco'], ['san', 'Sanidade', '#3a6a7a', 'sanidade']]
const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

type Fio = { id: string; t: string; s: string; done: boolean }
type Agendada = { id: string; t: string; date: string; time: string; bell: boolean }
type Nota = { id: string; t: string; b: string; sec: boolean; novo?: boolean }
type Npc = PainelDados['npcs'][number]

const json = (url: string, method: string, body: unknown) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null)

export function usePainelVals(d: PainelDados, abaInicial: string) {
  const router = useRouter()
  const [mapas, setMapas] = useState<MapaItem[]>(d.mapas)
  const [naMesa, setNaMesa] = useState(d.naMesa)
  const api = `/api/campaigns/${d.id}`
  const [tab, setTab] = useState(abaInicial)
  const [tracks, setTracks] = useState(d.tracks)
  const [trkNew, setTrkNew] = useState('')
  const [fresh, setFresh] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [sealing, setSealing] = useState(false)
  const [party, setParty] = useState(d.party)
  const [threads, setThreads] = useState<Fio[]>(d.fios)
  const [thDraft, setThDraft] = useState('')
  const [sTitle, setSTitle] = useState('')
  const [sDate, setSDate] = useState('')
  const [sTime, setSTime] = useState('20:00')
  const [remind, setRemind] = useState(true)
  const [upcoming, setUpcoming] = useState<Agendada[]>(d.agendadas)
  const [openPast, setOpenPast] = useState<string | null>(d.past[0]?.id ?? null)
  const [npcs, setNpcs] = useState<Npc[]>(d.npcs)
  const [nName, setNName] = useState('')
  const [nType, setNType] = useState('Vilão')
  const [gone, setGone] = useState<Record<string, 'in' | 'out' | 'saindo'>>({})
  const [open, setOpen] = useState(d.isOpen)
  const [notes, setNotes] = useState<Nota[]>(d.notes)
  const [curNote, setCurNote] = useState<string | null>(d.notes[0]?.id ?? null)
  const [cName, setCName] = useState(d.nome)
  const [rolls, setRolls] = useState(ROLV[d.rolagens])
  const [code, setCode] = useState<string | null>(d.codigo)
  const [codeTick, setCodeTick] = useState(0)
  const [copied, setCopied] = useState(false)
  const [bot, setBot] = useState(d.bot)
  const nameSave = useRef<ReturnType<typeof setTimeout>>()
  const [arch, setArch] = useState('')
  const [sLive, setSLive] = useState<string | null>(d.aoVivo)
  const [sModal, setSModal] = useState(false)
  const [sName, setSName] = useState('')
  const [sErr, setSErr] = useState('')
  const [sShake, setSShake] = useState(0)
  const [sBusy, setSBusy] = useState(false)
  const [sSealed, setSSealed] = useState(false)
  const t = useRef<ReturnType<typeof setTimeout>[]>([])
  const noteSave = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => {
    setSDate(new Date().toISOString().slice(0, 10))
    const timers = t.current
    return () => { timers.forEach(clearTimeout); clearTimeout(noteSave.current); clearTimeout(nameSave.current) }
  }, [])
  const later = (fn: () => void, ms: number) => { t.current.push(setTimeout(fn, ms)) }
  const say = (msg: string) => { setToast(msg); later(() => setToast(null), 2400) }

  const seg = (arr: ([string, string] | string)[], cur: string, set: (k: string) => void) => arr.map(x => {
    const [k, l] = Array.isArray(x) ? x : [x, x], on = cur === k
    return { l, go: () => set(k), bg: on ? 'var(--surface)' : 'transparent', color: on ? 'var(--ink)' : 'var(--muted)', sh: on ? '0 1px 2px rgb(0 0 0/.1)' : 'none' }
  })
  const chip = (arr: string[], isOn: (k: string) => boolean, tap: (k: string) => void) => arr.map(k => {
    const on = isOn(k)
    return { l: k, go: () => tap(k), bg: on ? 'var(--ink)' : 'var(--surface)', color: on ? 'var(--bg)' : 'var(--ink)', ring: on ? 'var(--ink)' : 'var(--line)' }
  })
  const sw = (on: boolean, go: () => void) => ({ track: on ? 'var(--accent)' : 'var(--line)', knob: on ? '21px' : '3px', go })

  const apps = d.apps.filter(a => gone[a.id] !== 'in' && gone[a.id] !== 'out')
  const members = party.length

  // ── Sessão ──
  const sDefault = `Sessão ${roman(d.proximaSessao)}`
  const sessGo = async () => {
    if (sBusy) return
    setSBusy(true); setSErr('')
    const nome = sName.trim() || sDefault
    const [r] = await Promise.all([json(`${api}/sessions/start`, 'POST', { name: nome }), new Promise(res => setTimeout(res, 900))])
    setSBusy(false)
    if (r?.status === 409) { setSErr('Já existe uma sessão ativa nesta campanha. Encerre a outra na Mesa antes de começar.'); setSShake(n => n + 1); return }
    if (!r?.ok) { setSErr('Não foi possível concluir agora. Tente de novo.'); setSShake(n => n + 1); return }
    setSModal(false); setSSealed(true); setSLive(nome)
    later(() => { setSSealed(false); router.refresh() }, 1700)
  }

  // ── Barras de recurso ──
  const salvarTracks = (next: PainelDados['tracks']) => {
    setTracks(next)
    void json(api, 'PATCH', { resourceTracks: next })
  }
  const trkAdd = () => {
    const l = trkNew.trim(); if (!l || tracks.length >= 6) return
    const taken = new Set(tracks.map(x => x.key))
    let key = l.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24) || 'barra'
    for (let i = 2; taken.has(key); i++) key = `${key.replace(/_\d+$/, '')}_${i}`
    salvarTracks([...tracks, { key, label: l.slice(0, 40), color: 'neutro' }]); setTrkNew('')
  }
  const custom = tracks.filter(x => !TRK_BASE.some(([k]) => k === x.key))
  const trkList: [string, string, string, string][] = [...TRK_BASE, ...custom.map(x => [x.key, x.label, 'var(--accent)', x.color] as [string, string, string, string])]

  // ── NPCs ──
  const addNpc = async () => {
    const n = nName.trim(); if (!n) return
    const r = await json(`${api}/npcs`, 'POST', { name: n, type: NPC_TIPO[nType] ?? 'NEUTRAL' })
    const novo = r?.ok ? await r.json().catch(() => null) as { id?: string } | null : null
    if (!novo?.id) { say('Não foi possível concluir agora. Tente de novo.'); return }
    setNpcs(xs => [{ id: novo.id!, n, type: nType, d: 'Recém-criado no painel. Complete a ficha quando quiser.', vis: false, img: null }, ...xs])
    setNName(''); setFresh(novo.id); say(`${n} entrou no elenco`)
  }
  const setVis = (id: string, vis: boolean) => {
    setNpcs(xs => xs.map(x => (x.id === id ? { ...x, vis } : x)))
    void json(`${api}/npcs/${id}`, 'PATCH', { isPublic: vis })
  }

  // ── Notas ──
  const nota = notes.find(n => n.id === curNote) ?? notes[0]
  const salvarNota = (n: Nota) => {
    clearTimeout(noteSave.current)
    noteSave.current = setTimeout(async () => {
      const body = { title: n.t, content: n.b, visibility: n.sec ? 'GM_ONLY' : 'CAMPAIGN' }
      if (n.novo) {
        if (!n.b.trim()) return // a API exige conteúdo: a nota nasce quando você escreve
        const r = await json(`${api}/notes`, 'POST', body)
        const criada = r?.ok ? await r.json().catch(() => null) as { id?: string } | null : null
        if (criada?.id) { setNotes(xs => xs.map(x => (x.id === n.id ? { ...x, id: criada.id!, novo: false } : x))); setCurNote(c => (c === n.id ? criada.id! : c)) }
      } else {
        void json(`${api}/notes/${n.id}`, 'PATCH', body) // TODO(api): PATCH /api/campaigns/[id]/notes/[noteId]
      }
    }, 800)
  }
  const updNote = (p: Partial<Nota>) => {
    if (!nota) return
    const n = { ...nota, ...p }
    setNotes(xs => xs.map(x => (x.id === nota.id ? n : x))); salvarNota(n)
  }

  const archOk = arch.trim() === cName.trim()
  const icones: [string, string, LucideIcon][] = [['geral', 'Visão geral', LayoutDashboard], ['sessoes', 'Sessões', CalendarDays], ['npcs', 'NPCs', Users], ['mapas', 'Mapas', MapIcon], ['inscricoes', 'Inscrições', Mail], ['notas', 'Notas', NotebookPen], ['config', 'Configurações', Settings]]

  return {
    $href: (link: string) => dcHref(link, { campaignId: d.id }),
    // NPC usa a imagem da ficha; a capa é a da campanha.
    $img: (id: string): string | null => (id.startsWith('npc-') ? npcs.find(n => `npc-${n.id}` === id)?.img ?? null : id === 'camp-capa-0' ? d.capa : null),
    campanha: cName, heroLine: d.heroLine,
    trkNew, onTrkNew: (e: ChangeEvent<HTMLInputElement>) => setTrkNew(e.target.value), onTrkKey: (e: KeyboardEvent) => { if (e.key === 'Enter') trkAdd() }, addTrk: trkAdd,
    trkOpts: trkList.map(([k, l, dot, color]) => {
      const on = tracks.some(x => x.key === k)
      return {
        l, dot, on, bg: on ? 'var(--ink)' : 'var(--surface)', color: on ? 'var(--bg)' : 'var(--ink)', ring: on ? 'var(--ink)' : 'var(--line)',
        go: () => salvarTracks(on ? tracks.filter(x => x.key !== k) : [...tracks, { key: k, label: l === 'Pontos de vida' ? 'Pontos de Vida' : l === 'Pontos de esforço' ? 'Pontos de Esforço' : l, color }]),
      }
    }),
    modeloLine: d.modelo ? `Modelo de ficha: ${d.modelo.nome}${d.modelo.preset ? ' (pré-definido)' : ''}` : 'Modelo de ficha: sem sistema definido',
    modeloHref: d.modelo?.sistemaId ? `/sistemas/${d.modelo.sistemaId}` : '/sistemas',
    botLine: d.botLine,

    sessLive: !!sLive, sessIdle: !sLive, sessLiveName: sLive ?? '',
    sessModal: sModal, sessSealed: sSealed,
    sessOpen: () => { setSModal(true); setSErr(''); setSName('') }, sessClose: () => { setSModal(false); setSBusy(false) },
    sessName: sName, sessOnName: (e: ChangeEvent<HTMLInputElement>) => { setSName(e.target.value); setSErr('') },
    sessKey: (e: KeyboardEvent) => { if (e.key === 'Enter') void sessGo(); if (e.key === 'Escape') setSModal(false) },
    sessHint: sName.trim() ? 'É assim que ela vai aparecer na crônica.' : `Em branco, ela entra na crônica como “${sDefault}”.`,
    sessFacts: ([[Radio, 'A Mesa fica ao vivo e os jogadores entram por ela.'], [Dices, 'As rolagens a partir de agora contam para esta sessão.'], [Hourglass, 'O tempo de mesa começa a contar até você encerrar na Mesa.']] as [LucideIcon, string][]).map(([icon, l]) => ({ icon, l })),
    sessErr: sErr, sessShake: sShake ? `${sShake % 2 ? 'painel-shakeA' : 'painel-shakeB'} .45s both` : 'none',
    sessStart: () => void sessGo(), sessBusy: sBusy, sessBusyOp: sBusy ? 0.75 : 1, sessSpin: sBusy ? 'inline-block' : 'none', sessBtn: sBusy ? 'Acendendo as velas…' : 'Iniciar sessão',

    tabs: icones.map(([k, l, icon]) => ({
      l, icon, n: apps.length, bd: k === 'inscricoes' && apps.length ? 'inline-block' : 'none',
      go: () => { setTab(k); window.history.replaceState(null, '', `?aba=${k}`) },
      color: tab === k ? 'var(--ink)' : 'var(--muted)', line: tab === k ? 'inset 0 -2px 0 var(--accent)' : 'none',
    })),
    tOver: tab === 'geral', tSess: tab === 'sessoes', tNpc: tab === 'npcs', tApps: tab === 'inscricoes', tNotes: tab === 'notas', tCfg: tab === 'config', tMapas: tab === 'mapas',
    // Aba Mapas: SagaMapas no modo painel; "Abrir na mesa" leva à Mesa com o mapa aberto.
    mapasProps: { campaignId: d.id, modo: 'painel' as const, mapas, naMesa, onChange: (ms: MapaItem[], nm: string) => { setMapas(ms); setNaMesa(nm) }, onAbrir: (id: string) => router.push(`/campaign/${d.id}/mesa?mapa=${id}`) },

    party: party.map((p, i) => {
      const pct = p.mx > 0 ? Math.round(p.hp / p.mx * 100) : 0
      return { u: p.u, c: p.c, cls: p.cls, i: p.c.charAt(0).toUpperCase(), bg: AV[i % AV.length], hp: `${p.hp}/${p.mx}`, pct, bar: pct > 50 ? 'var(--ok)' : pct > 25 ? 'var(--gold)' : 'var(--accent)', dot: p.on ? 'var(--ok)' : 'var(--line)', st: p.on ? 'na mesa' : 'ausente', stColor: p.on ? 'var(--ok)' : 'var(--muted)', anim: i >= d.party.length ? 'painel-rowIn .5s both' : 'none' }
    }),
    partyLine: `${members} jogadores · ${party.filter(p => p.on).length} na mesa agora`,
    threads: threads.map(x => ({
      ...x, m: x.done ? '✓' : '', bg: x.done ? 'var(--ok)' : 'transparent', ring: x.done ? 'var(--ok)' : 'var(--muted)', color: x.done ? 'var(--muted)' : 'var(--ink)', td: x.done ? 'line-through' : 'none',
      anim: x.id === fresh ? 'painel-rowIn .4s both' : 'none',
      go: () => { setThreads(xs => xs.map(y => (y.id === x.id ? { ...y, done: !y.done } : y))); if (!x.id.startsWith('fio-')) void json(`${api}/fios/${x.id}`, 'PATCH', { feito: !x.done }) },
    })),
    threadsLine: `${threads.filter(x => !x.done).length} em aberto`,
    thDraft, onTh: (e: ChangeEvent<HTMLInputElement>) => setThDraft(e.target.value),
    onThKey: (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || !thDraft.trim()) return
      const id = `fio-${Date.now()}`, texto = thDraft.trim(), s = sLive ?? sDefault
      setThreads(xs => [...xs, { id, t: texto, s, done: false }]); setThDraft(''); setFresh(id)
      void (async () => {
        const r = await json(`${api}/fios`, 'POST', { texto, sessao: s })
        const f = r?.ok ? await r.json().catch(() => null) as { id?: string } | null : null
        if (f?.id) setThreads(xs => xs.map(y => (y.id === id ? { ...y, id: f.id! } : y)))
        else { setThreads(xs => xs.filter(y => y.id !== id)); say('Não foi possível guardar o fio. Tente de novo.') }
      })()
    },
    kpis: [{ v: d.kpis.sessoes, l: 'sessões' }, { v: d.kpis.horas, l: 'jogadas' }, { v: d.kpis.rolagens, l: 'rolagens' }, { v: npcs.length, l: 'NPCs' }],
    feed: d.feed,
    sTitle, onSTitle: (e: ChangeEvent<HTMLInputElement>) => setSTitle(e.target.value), sDate, onSDate: (e: ChangeEvent<HTMLInputElement>) => setSDate(e.target.value), sTime, onSTime: (e: ChangeEvent<HTMLInputElement>) => setSTime(e.target.value),
    swRemind: sw(remind, () => setRemind(!remind)),
    schedule: () => {
      const id = `ag-${Date.now()}`, titulo = sTitle.trim() || `Sessão ${roman(d.proximaSessao + upcoming.length + (sLive ? 1 : 0))}`
      setUpcoming(xs => [...xs, { id, t: titulo, date: sDate, time: sTime, bell: remind }].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))); setFresh(id); setSTitle('')
      void (async () => {
        const r = await json(`${api}/sessoes-agendadas`, 'POST', { titulo, data: sDate, horario: sTime, lembrete: remind })
        const ag = r?.ok ? await r.json().catch(() => null) as { id?: string } | null : null
        if (ag?.id) { setUpcoming(xs => xs.map(x => (x.id === id ? { ...x, id: ag.id! } : x))); say(remind && bot ? 'Sessão agendada · o bot vai lembrar a mesa' : 'Sessão agendada'); return }
        const j = r ? await r.json().catch(() => null) as { error?: string } | null : null
        setUpcoming(xs => xs.filter(x => x.id !== id)); say(j?.error ?? 'Não foi possível agendar. Tente de novo.')
      })()
    },
    upcoming: upcoming.map(u => {
      const dt = new Date(`${u.date}T12:00`)
      return { t: u.t, d: dt.getDate(), m: MES[dt.getMonth()], s: `${DOW[dt.getDay()]} · ${u.time} · ${members} jogadores`, bellD: u.bell ? 'inline-flex' : 'none', anim: u.id === fresh ? 'painel-rowIn .5s both' : 'none', rm: () => { setUpcoming(xs => xs.filter(x => x.id !== u.id)); if (!u.id.startsWith('ag-')) void json(`${api}/sessoes-agendadas/${u.id}`, 'DELETE', {}) } }
    }),
    past: d.past.map(p => ({
      n: roman(p.n), t: p.t, w: p.w, sum: p.sum, open: openPast === p.id, href: `/campaign/${d.id}/sessions/${p.id}`,
      dotBg: p.live ? 'var(--accent)' : 'var(--gold)', dotAnim: p.live ? 'painel-pulse 2s infinite' : 'none', go: () => setOpenPast(openPast === p.id ? null : p.id),
    })),
    nName, onNName: (e: ChangeEvent<HTMLInputElement>) => setNName(e.target.value), onNKey: (e: KeyboardEvent) => { if (e.key === 'Enter') void addNpc() }, addNpc: () => void addNpc(),
    nTypes: chip(Object.keys(NPCC), k => nType === k, setNType),
    npcLine: `${npcs.length} NPCs · ${npcs.filter(n => n.vis).length} visíveis aos jogadores`,
    revealAll: () => { npcs.filter(n => !n.vis).forEach(n => setVis(n.id, true)); say('Todos os NPCs revelados à mesa') },
    npcs: npcs.map((n, i) => ({
      ...n, slot: `npc-${n.id}`, cover: COV[i % 4], tBg: NPCC[n.type] ?? NPCC['Neutro'], hideOp: n.vis ? 0 : 1, anim: n.id === fresh ? 'painel-popIn .45s cubic-bezier(.3,1.3,.5,1) both' : 'none',
      vLabel: n.vis ? 'Visível aos jogadores' : 'Restrito ao mestre', vIcon: n.vis ? Eye : EyeOff, vBg: n.vis ? 'color-mix(in oklab, var(--ok) 15%, transparent)' : 'var(--surface2)', vColor: n.vis ? 'var(--ok)' : 'var(--muted)',
      toggle: () => setVis(n.id, !n.vis),
    })),
    apps: apps.map((a, i) => ({
      ...a, i: a.u.charAt(0).toUpperCase(), bg: AV[(i + 5) % AV.length], anim: gone[a.id] === 'saindo' ? 'painel-letterOut .45s ease-in forwards' : 'none',
      tags: a.tags.map(x => ({ l: x.l, bg: x.ok ? 'rgb(79 122 58/.14)' : 'rgb(185 138 42/.16)', color: x.ok ? '#3e6a2a' : '#7a5a1c' })),
      accept: async () => {
        setSealing(true)
        const [r] = await Promise.all([json(`${api}/applications/${a.id}`, 'PATCH', { status: 'approved' }), new Promise(res => setTimeout(res, 800))])
        setSealing(false)
        if (!r?.ok && r?.status !== 409) { say('Não foi possível concluir agora. Tente de novo.'); return }
        setGone(g => ({ ...g, [a.id]: 'in' })); setParty(ps => [...ps, { u: a.u, c: a.u, cls: 'Sem personagem', hp: 0, mx: 0, on: false }])
        say(`${a.u} agora faz parte da companhia`)
      },
      decline: () => {
        setGone(g => ({ ...g, [a.id]: 'saindo' }))
        void json(`${api}/applications/${a.id}`, 'PATCH', { status: 'rejected' })
        later(() => setGone(g => ({ ...g, [a.id]: 'out' })), 450)
      },
    })),
    noApps: apps.length === 0, isSealing: sealing,
    seats: Array.from({ length: d.vagas }, (_, j) => j < members
      ? { i: party[j].u.charAt(0).toUpperCase(), t: party[j].u, bg: AV[j % AV.length], ring: 'transparent', anim: j >= d.party.length ? 'painel-popIn .4s both' : 'none' }
      : { i: '', t: 'Livre', bg: 'transparent', ring: 'var(--muted)', anim: 'none' }),
    seatLine: members >= d.vagas ? 'Mesa completa — inscrições pausadas.' : `${members} de ${d.vagas} vagas ocupadas · ${d.vagas - members} livres`,
    swOpen: sw(open && members < d.vagas, () => { const v = !open; setOpen(v); void json(api, 'PATCH', { isOpen: v }) }),
    notes: notes.map(n => ({
      t: n.t || 'Sem título', p: n.b.slice(0, 60), lockD: n.sec ? 'inline-flex' : 'none', bg: n.id === nota?.id ? 'var(--surface)' : 'transparent', ring: n.id === nota?.id ? 'var(--accent)' : 'var(--line)',
      anim: n.id === fresh ? 'painel-rowIn .4s both' : 'none', go: () => setCurNote(n.id),
    })),
    addNote: () => { const id = `nova-${Date.now()}`; setNotes(xs => [{ id, t: 'Nova nota', b: '', sec: true, novo: true }, ...xs]); setCurNote(id); setFresh(id) },
    cur: { t: nota?.t ?? '', b: nota?.b ?? '', hint: nota?.sec ? 'Só você vê esta nota.' : 'Visível para toda a companhia no canal da campanha.' },
    onNT: (e: ChangeEvent<HTMLInputElement>) => updNote({ t: e.target.value }), onNB: (e: ChangeEvent<HTMLTextAreaElement>) => updNote({ b: e.target.value }),
    swSecret: sw(!!nota?.sec, () => updNote({ sec: !nota?.sec })),
    cName, onCName: (e: ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value
      setCName(v); clearTimeout(nameSave.current)
      if (v.trim().length >= 2) nameSave.current = setTimeout(async () => { const r = await json(api, 'PATCH', { name: v.trim() }); if (!r?.ok) say('Não foi possível renomear. Tente de novo.') }, 900)
    },
    visOpts: seg([['Privada', 'Só por convite'], ['Taverna', 'Listada na Taverna']], open ? 'Taverna' : 'Privada', k => { const v = k === 'Taverna'; setOpen(v); void json(api, 'PATCH', { isOpen: v }) }),
    rollOpts: seg(['Todos', 'Só o mestre', 'Cada um escolhe'], rolls, k => { setRolls(k); void json(api, 'PATCH', { rollVisibility: ROLV_API[k] }) }),
    code: code ?? '—', codeAnim: codeTick ? `${codeTick % 2 ? 'painel-popA' : 'painel-popB'} .35s` : 'none',
    newCode: () => {
      const r = () => A[Math.floor(Math.random() * A.length)]
      const c = `${r()}${r()}${r()}${r()}-${r()}${r()}${r()}${r()}`
      setCode(c); setCodeTick(n => n + 1); setCopied(false)
      // O servidor confirma (ou troca, se o código já existir em outra mesa).
      void (async () => {
        const r = await json(`${api}/convite`, 'POST', { codigo: c.replace('-', '') })
        const j = r?.ok ? await r.json().catch(() => null) as { codigo?: string } | null : null
        if (j?.codigo) setCode(`${j.codigo.slice(0, 4)}-${j.codigo.slice(4)}`)
        else { setCode(d.codigo); say('Não foi possível gerar outro código. Tente de novo.') }
      })()
    },
    copy: () => { if (!code) return; try { void navigator.clipboard?.writeText(code) } catch { /* sem clipboard */ } setCopied(true) },
    copyLabel: copied ? 'Copiado' : 'Copiar', copyIcon: copied ? Check : Copy, swBot: sw(bot, () => { const v = !bot; setBot(v); void json(api, 'PATCH', { botEnabled: v }) }),
    arch, onArch: (e: ChangeEvent<HTMLInputElement>) => setArch(e.target.value), archOp: archOk ? 1 : 0.45, archBg: archOk ? 'var(--accent)' : 'transparent', archColor: archOk ? '#fff8f0' : 'var(--accent)', archLabel: 'Arquivar campanha',
    archive: async () => {
      if (!archOk) return
      const r = await json(`${api}/arquivar`, 'POST', {})
      if (r?.ok) { router.push('/campanhas'); return }
      const j = r ? await r.json().catch(() => null) as { error?: string } | null : null
      say(j?.error ?? 'Não foi possível concluir agora. Tente de novo.')
    },
    hasToast: !!toast, toast,
  }
}

export type Vals = ReturnType<typeof usePainelVals>
