'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent as RPointerEvent, type WheelEvent } from 'react'
import {
  CirclePlus, CloudFog, Crown, Eye, Hand, ImageUp, List, MousePointer2, Music, Pause, Play, RadioTower, Ruler, ScrollText, Swords,
  type LucideIcon,
} from 'lucide-react'
import { dcHref } from '@/lib/dc-routes'
import { toggleTema } from '@/lib/tema'
import { safeImageUrl } from '@/lib/safe-url'
import { attributeModifier, attributePool, isD20Category, type SheetCategory } from '@/lib/system-category'
import { PRESETS } from '@/components/mesa/MusicPlayer'
import { PLAYER_COLORS, initTokens, type Marker, type Member, type RollLogEntry, type SessionState, type Token } from '@/components/mesa/types'

/** Dados reais de /campaign/[id]/mesa?nova=1 (app/(app)/campaign/[id]/mesa/page.tsx). */
export type MesaDados = {
  campaignId: string; campanha: string; souMestre: boolean; meuId: string
  categoria: SheetCategory; temPv: boolean
  sessao: null | {
    id: string; nome: string; numero: number; ativa: boolean; inicio: string
    tokensJson: string | null; mapa: string | null; musica: string | null; volume: number; liveJson: string | null
  }
  membros: {
    id: string; role: string; u: string
    char: null | { id: string; n: string; raca: string | null; classe: string | null; nivel: number; hp: number; max: number; img: string | null; attrs: { n: string; v: number; die: string }[] }
  }[]
  rolagens: RollLogEntry[]
  totalRolagens: number
}

type Tool = 'select' | 'pan' | 'token' | 'ping' | 'measure' | 'fog'
type Nevoa = { id: string; label: string; x: number; y: number; w: number; h: number; on: boolean }
type Rolagem = { face: string | number; label: string; done: boolean; total?: number; detail?: string; crit?: boolean; fail?: boolean }

const CELL = 40
const GM_COR = '#b98a2a'
const ORDEM = ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma']
const CONDS = ['Envenenado', 'Caído', 'Agarrado', 'Oculto']
const TERRENO = 'radial-gradient(ellipse 18% 22% at 20% 30%, rgb(70 90 40/.35), transparent 70%),radial-gradient(ellipse 14% 18% at 70% 80%, rgb(70 90 40/.3), transparent 70%),linear-gradient(110deg, transparent 44%, rgb(70 110 130/.45) 45%, rgb(90 130 150/.5) 52%, transparent 53%),radial-gradient(ellipse at 50% 45%, #ead8b0, #d6bc86 75%, #b8955c)'
const TOOLS: Record<Tool, [string, LucideIcon, string, string]> = {
  select: ['Selecionar e mover', MousePointer2, 'V', 'Arraste tokens · clique para ver detalhes'],
  pan: ['Mover mapa', Hand, 'H', 'Arraste para mover o mapa · role para zoom'],
  token: ['Novo token', CirclePlus, 'T', 'Clique no mapa para adicionar um inimigo'],
  ping: ['Ping', RadioTower, 'P', 'Clique para marcar um ponto para todos'],
  measure: ['Régua', Ruler, 'R', 'Arraste para medir · 1 quadrado = 1,5 m'],
  fog: ['Névoa', CloudFog, 'F', 'Arraste para cobrir uma área · clique nela para revelar ou esconder'],
}
const KEYS: Record<string, Tool> = { v: 'select', h: 'pan', t: 'token', p: 'ping', r: 'measure', f: 'fog' }
const TABS: [string, string, LucideIcon][] = [['ini', 'Iniciativa', Swords], ['fichas', 'Fichas', ScrollText], ['log', 'Registro', List], ['music', 'Música', Music]]

const hpC = (p: number) => p > 50 ? '#6a9a4a' : p > 25 ? '#d9a22a' : '#c8424c'
const sg = (v: number) => (v >= 0 ? '+' : '') + v
const p2 = (n: number) => String(n).padStart(2, '0')
const hhmm = (iso: string) => { const d = new Date(iso); return `${p2(d.getHours())}:${p2(d.getMinutes())}` }
const primeiro = (s: string) => s.split(/[ ,]/)[0] || s
const sigla = (nome: string) => nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()
const ytId = (s: string) => s.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]{11})/)?.[1] ?? (/^[a-zA-Z0-9_-]{11}$/.test(s) ? s : null)
const parse = <T,>(raw: string | null | undefined, fb: T): T => { if (!raw) return fb; try { return JSON.parse(raw) as T } catch { return fb } }
const patch = (campaignId: string, body: Record<string, unknown>) =>
  fetch(`/api/campaigns/${campaignId}/sessions/state`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null)

export function useMesaVals(d: MesaDados) {
  const gm = d.souMestre, api = `/api/campaigns/${d.campaignId}`, ativa = !!d.sessao?.ativa
  const ctx = { campaignId: d.campaignId }

  // Membros no formato da Mesa atual, para os tokens iniciais saírem iguais.
  const membrosMesa: Member[] = useMemo(() => d.membros.map(m => ({
    id: m.id, role: m.role, user: { username: m.u },
    character: m.char ? { id: m.char.id, name: m.char.n, race: m.char.raca, class: m.char.classe, level: m.char.nivel, hp: m.char.hp, maxHp: m.char.max, imageUrl: m.char.img, attributes: [] } : null,
  })), [d.membros])
  // Cor e nome de quem rola, pelo username gravado no RollLog.
  const quem = useMemo(() => {
    const map = new Map<string, { n: string; c: string }>()
    let k = 0
    for (const m of d.membros) {
      if (m.role === 'GM') map.set(m.u, { n: m.u, c: GM_COR })
      else map.set(m.u, { n: m.char ? primeiro(m.char.n) : m.u, c: PLAYER_COLORS[k++ % PLAYER_COLORS.length]! })
    }
    return map
  }, [d.membros])
  const eu = d.membros.find(m => m.id === d.meuId)!
  const euNome = eu.char && !gm ? primeiro(eu.char.n) : eu.u

  const [tool, setTool] = useState<Tool>('select')
  const [zoom, setZoom] = useState(.9)
  const [pan, setPan] = useState({ x: 24, y: 20 })
  const [sel, setSel] = useState<string | null>(null)
  const [drag, setDrag] = useState<{ id: string; ox: number; oy: number; px: number; py: number; moved?: boolean } | null>(null)
  const [panning, setPanning] = useState<{ sx: number; sy: number; ox: number; oy: number } | null>(null)
  const [measure, setMeasure] = useState<{ x1: number; y1: number; x2: number; y2: number; active: boolean } | null>(null)
  const [fogDraw, setFogDraw] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  const [pings, setPings] = useState<{ id: string; x: number; y: number; who: string }[]>([])
  const [nevoa, setNevoa] = useState<Nevoa[]>([])
  const [pv, setPv] = useState(false)
  const [mapEdit, setMapEdit] = useState(false)
  const [mapDraft, setMapDraft] = useState('')
  const [mapa, setMapa] = useState<string | null>(d.sessao?.mapa ?? null)
  const [mapSize, setMapSize] = useState({ w: 0, h: 0 })
  const [tokens, setTokens] = useState<Token[]>(() => parse<Token[] | null>(d.sessao?.tokensJson, null) ?? initTokens(membrosMesa))
  const [live, setLive] = useState<string[]>(() => parse<string[]>(d.sessao?.liveJson, []))
  const [tab, setTab] = useState('ini')
  const [sheet, setSheet] = useState<string | null>(() => (d.membros.find(m => m.id === d.meuId && m.char) ?? d.membros.find(m => m.char && m.role !== 'GM'))?.id ?? null)
  const [dice, setDice] = useState({ n: 1, d: 20, mod: 0, adv: 'normal' })
  const [roll, setRoll] = useState<Rolagem | null>(null)
  const [log, setLog] = useState<RollLogEntry[]>(d.rolagens)
  const [nRolls, setNRolls] = useState(d.totalRolagens)
  const [fresh, setFresh] = useState<string | null>(null)
  const [musica, setMusica] = useState<string | null>(d.sessao?.musica ?? null)
  const [ultima, setUltima] = useState<string | null>(d.sessao?.musica ?? null)
  const [mudo, setMudo] = useState(false)
  const [vol, setVol] = useState(d.sessao?.volume ?? 50)
  const [linkMusica, setLinkMusica] = useState('')
  const [online, setOnline] = useState<string[]>([d.meuId])
  const [agora, setAgora] = useState<number | null>(null)
  const [endOpen, setEndOpen] = useState(false)
  const [ended, setEnded] = useState<number | null>(null)
  const [endErro, setEndErro] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const boardRef = useRef<HTMLDivElement>(null)
  const vpRef = useRef<HTMLElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const st = useRef({ tokens, drag, panning, measure, fogDraw, zoom, roll, log })
  st.current = { tokens, drag, panning, measure, fogDraw, zoom, roll, log }
  const sinceRef = useRef(d.rolagens[0]?.rolledAt ?? new Date(0).toISOString())
  const editRef = useRef(0) // última mudança local nos tokens: a sondagem não sobrescreve logo depois
  const syncT = useRef<ReturnType<typeof setTimeout>>()
  const pingsVistos = useRef(new Set<string>())
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const nevoaKey = d.sessao ? `saga-mesa-nevoa-${d.sessao.id}` : null

  const podeSync = gm || live.includes(d.meuId)
  const podeMover = useCallback((t: Token) => gm || (live.includes(d.meuId) && (t.id === d.meuId || !!t.allowedPlayers?.includes(d.meuId))), [gm, live, d.meuId])
  const avisar = (txt: string) => { setAviso(txt); const t = setTimeout(() => setAviso(null), 3200); timers.current.push(t) }

  // Grava os tokens na sessão. `logo` = soltar um token; o resto espera 400 ms
  // (o PATCH tem limite de 30/min por pessoa).
  const salvarTokens = useCallback((next: Token[], logo = false) => {
    editRef.current = Date.now()
    if (!ativa || !podeSync) return
    clearTimeout(syncT.current)
    const send = () => { void patch(d.campaignId, { tokensJson: JSON.stringify(next) }) }
    if (logo) send(); else syncT.current = setTimeout(send, 400)
  }, [ativa, podeSync, d.campaignId])
  const mudarTokens = (fn: (ts: Token[]) => Token[], logo = false) => {
    const next = fn(st.current.tokens)
    setTokens(next)
    salvarTokens(next, logo)
  }

  // ── Relógio, presença e sondagem da sessão ──
  useEffect(() => {
    setAgora(Date.now())
    const iv = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [])
  // Névoa só do mestre, guardada neste navegador (TODO(api): nevoaJson na sessão).
  // Estado (não ref): o efeito de gravar só roda depois do render com a névoa lida.
  const [nevoaLida, setNevoaLida] = useState(false)
  useEffect(() => {
    if (nevoaKey) try { const v = localStorage.getItem(nevoaKey); if (v) setNevoa(JSON.parse(v) as Nevoa[]) } catch { /* sem storage */ }
    setNevoaLida(true)
  }, [nevoaKey])
  useEffect(() => {
    if (nevoaKey && gm && nevoaLida) try { localStorage.setItem(nevoaKey, JSON.stringify(nevoa)) } catch { /* sem storage */ }
  }, [nevoa, nevoaKey, gm, nevoaLida])
  useEffect(() => {
    const tick = async () => {
      void fetch(`${api}/presence`, { method: 'POST' }).catch(() => null)
      const r = await fetch(`${api}/presence`).catch(() => null)
      const j = r?.ok ? await r.json().catch(() => null) as { onlineIds?: string[] } | null : null
      if (j?.onlineIds) setOnline(Array.from(new Set([...j.onlineIds, d.meuId])))
    }
    void tick()
    const iv = setInterval(tick, 20_000)
    return () => clearInterval(iv)
  }, [api, d.meuId])
  useEffect(() => {
    if (!ativa || ended) return
    const iv = setInterval(async () => {
      const r = await fetch(`${api}/rolls?since=${encodeURIComponent(sinceRef.current)}`).catch(() => null)
      if (!r?.ok) return
      const j = await r.json().catch(() => null) as { rolls?: RollLogEntry[]; sessionState?: SessionState | null } | null
      const novas = (j?.rolls ?? []).map(x => ({ ...x, rolledAt: new Date(x.rolledAt).toISOString() }))
      if (novas.length) {
        sinceRef.current = novas[0]!.rolledAt
        const dados = novas.filter(x => x.expression !== 'chat')
        const ids = new Set(st.current.log.map(x => x.id))
        const add = dados.filter(x => !ids.has(x.id))
        if (add.length) { setLog(prev => [...add, ...prev.filter(x => !add.some(a => a.id === x.id))].slice(0, 50)); setNRolls(n => n + add.length) }
      }
      const s = j?.sessionState
      if (!s) return
      if (!st.current.drag && Date.now() - editRef.current > 6000 && s.tokensJson) {
        const ts = parse<Token[] | null>(s.tokensJson, null)
        if (ts) setTokens(ts)
      }
      setMapa(s.mapImageUrl)
      setMusica(s.musicYoutubeId)
      if (s.musicYoutubeId) setUltima(s.musicYoutubeId)
      if (!gm) setVol(s.musicVolume)
      setLive(parse<string[]>(s.liveMembersJson, []))
      const ms = parse<Marker[]>(s.markersJson ?? null, [])
      const now = Date.now()
      for (const m of ms) {
        if (pingsVistos.current.has(m.id) || now - m.createdAt > 10_000) continue
        pingsVistos.current.add(m.id)
        mostrarPing(m.id, m.x, m.y, m.who ?? '')
      }
    }, 5000)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, ativa, ended, gm])
  useEffect(() => () => { timers.current.forEach(clearTimeout); clearTimeout(syncT.current) }, [])

  // ── Música (YouTube sem cookies: é o único frame liberado na CSP) ──
  const yt = (func: string, args: unknown[] = []) =>
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*')
  useEffect(() => { yt('setVolume', [vol]) }, [vol])
  useEffect(() => { yt(mudo ? 'pauseVideo' : 'playVideo') }, [mudo])
  const tocar = (id: string | null) => {
    setMusica(id); if (id) { setUltima(id); setMudo(false) }
    if (gm && ativa) void patch(d.campaignId, { musicYoutubeId: id, musicVolume: vol })
  }
  const volT = useRef<ReturnType<typeof setTimeout>>()

  // ── Ponteiro ──
  const pt = (e: { clientX: number; clientY: number }) => {
    const r = boardRef.current!.getBoundingClientRect(), z = st.current.zoom
    return { x: (e.clientX - r.left) / z, y: (e.clientY - r.top) / z }
  }
  const cel = (v: number) => Math.floor(v / CELL)
  const W = Math.max(1200, mapSize.w, ...tokens.map(t => Math.ceil((t.x + CELL) / CELL) * CELL))
  const H = Math.max(800, mapSize.h, ...tokens.map(t => Math.ceil((t.y + CELL) / CELL) * CELL))

  useEffect(() => {
    const mv = (e: PointerEvent) => {
      const s = st.current
      if (s.drag) { const p = pt(e); setDrag({ ...s.drag, px: p.x - s.drag.ox, py: p.y - s.drag.oy, moved: true }) }
      else if (s.panning) setPan({ x: s.panning.ox + e.clientX - s.panning.sx, y: s.panning.oy + e.clientY - s.panning.sy })
      else if (s.measure?.active) { const p = pt(e); setMeasure({ ...s.measure, x2: cel(p.x) * CELL + 20, y2: cel(p.y) * CELL + 20 }) }
      else if (s.fogDraw) { const p = pt(e); setFogDraw({ ...s.fogDraw, x2: cel(p.x), y2: cel(p.y) }) }
    }
    const up = () => {
      const s = st.current
      if (s.drag) {
        const g = s.drag
        setDrag(null)
        // Centro do token em px do tabuleiro (formato da Mesa atual), no meio da casa.
        if (g.moved) mudarTokens(ts => ts.map(t => t.id === g.id ? { ...t, x: Math.max(0, Math.round(g.px / CELL)) * CELL + 20, y: Math.max(0, Math.round(g.py / CELL)) * CELL + 20 } : t), true)
      }
      if (s.panning) setPanning(null)
      if (s.measure?.active) setMeasure({ ...s.measure, active: false })
      if (s.fogDraw) {
        const f = s.fogDraw, x = Math.min(f.x1, f.x2), y = Math.min(f.y1, f.y2)
        setFogDraw(null)
        setNevoa(prev => [...prev, { id: `n${Date.now()}`, label: `Área ${prev.length + 1}`, x, y, w: Math.abs(f.x2 - f.x1) + 1, h: Math.abs(f.y2 - f.y1) + 1, on: true }])
      }
    }
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salvarTokens])

  const mostrarPing = (id: string, x: number, y: number, who: string) => {
    setPings(p => [...p, { id, x, y, who }])
    const t = setTimeout(() => setPings(p => p.filter(q => q.id !== id)), 1300)
    timers.current.push(t)
  }

  // ── Rolagens (sempre no servidor: o resultado é o que fica no registro) ──
  const rolar = async (c: { n: number; d: number; mod: number; adv: string; what: string; who?: string }) => {
    if (st.current.roll && !st.current.roll.done) return
    if (!ativa) { avisar('Nenhuma sessão ao vivo · o Mestre inicia pelo Painel'); return }
    const who = c.who ?? euNome
    const adv = c.d === 20 && c.n === 1 ? c.adv : 'normal'
    const expr = `${c.n}d${c.d}${c.mod ? sg(c.mod) : ''}`
    setRoll({ face: '?', label: `${who} · ${c.what}`, done: false })
    const spin = setInterval(() => setRoll(r => r && !r.done ? { ...r, face: 1 + Math.floor(Math.random() * c.d) } : r), 70)
    const [res] = await Promise.all([
      fetch(`${api}/rolls`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expression: expr, attribute: `${who} · ${c.what}`, ...(adv !== 'normal' ? { adv } : {}) }) }).catch(() => null),
      new Promise(r => setTimeout(r, 1000)),
    ])
    clearInterval(spin)
    const e = res?.ok ? await res.json().catch(() => null) as (RollLogEntry & { isCrit?: boolean }) | null : null
    if (!e) {
      setRoll(null)
      avisar(res?.status === 429 ? 'Muitas rolagens seguidas · espere um instante' : 'Não foi possível rolar · tente de novo')
      return
    }
    const entry: RollLogEntry = { ...e, rolls: e.rolls as number[], rolledAt: new Date(e.rolledAt).toISOString() }
    const nat = c.d === 20 && c.n === 1 ? entry.rolls[0] ?? null : null
    // sinceRef não avança aqui: uma rolagem alheia anterior a esta ainda chega pela sondagem.
    setLog(prev => [entry, ...prev.filter(x => x.id !== entry.id)].slice(0, 50))
    setNRolls(n => n + 1)
    setFresh(entry.id)
    setRoll({ face: c.n === 1 ? entry.rolls[0] ?? entry.total : entry.total, label: `${who} · ${c.what}`, done: true, total: entry.total, detail: detalhe(entry), crit: nat === 20, fail: nat === 1 })
    const t = setTimeout(() => setRoll(null), 2200)
    timers.current.push(t)
  }
  function detalhe(l: RollLogEntry) {
    const adv = /^1?d20/i.test(l.expression) && l.rolls.length === 2 ? (l.rolls[0]! >= l.rolls[1]! ? ' vant.' : ' desv.') : ''
    return `${l.expression}${adv} · [${l.rolls.join(', ')}]`
  }

  // Teclas: V H T P R F, Esc e espaço para rolar.
  const rolarRef = useRef(() => {})
  rolarRef.current = () => { void rolar({ ...dice, what: 'Rolagem livre' }) }
  const toolsOk: Tool[] = gm ? ['select', 'pan', 'token', 'ping', 'measure', 'fog'] : ['select', 'pan', 'ping', 'measure']
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (/input|textarea|select/i.test((e.target as HTMLElement).tagName)) return
      const m = KEYS[e.key.toLowerCase()]
      if (m && toolsOk.includes(m)) { setTool(m); setMeasure(null) }
      if (e.key === 'Escape') { setSel(null); setMeasure(null) }
      if (e.key === ' ' && !st.current.roll) { e.preventDefault(); rolarRef.current() }
    }
    window.addEventListener('keydown', kd)
    return () => window.removeEventListener('keydown', kd)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gm])

  const vpDown = (e: RPointerEvent<HTMLElement>) => {
    if (mapEdit || e.button !== 0) return
    if ((e.target as HTMLElement).closest('[data-nevoa]') && tool === 'fog') return
    if (tool === 'pan') return setPanning({ sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y })
    const p = pt(e); if (p.x < 0 || p.y < 0 || p.x > W || p.y > H) return
    if (tool === 'select') { setSel(null); setMeasure(null); return }
    if (tool === 'ping') {
      const id = crypto.randomUUID(), m: Marker = { id, x: p.x, y: p.y, color: '#e0743a', createdAt: Date.now(), who: euNome }
      pingsVistos.current.add(id)
      mostrarPing(id, p.x, p.y, euNome)
      if (ativa) void patch(d.campaignId, { markersJson: JSON.stringify([m]) })
      return
    }
    if (tool === 'measure') { const x = cel(p.x) * CELL + 20, y = cel(p.y) * CELL + 20; return setMeasure({ x1: x, y1: y, x2: x, y2: y, active: true }) }
    if (tool === 'fog' && gm) return setFogDraw({ x1: cel(p.x), y1: cel(p.y), x2: cel(p.x), y2: cel(p.y) })
    if (tool === 'token' && gm) {
      const n = tokens.filter(t => t.label.startsWith('Inimigo')).length + 1, id = crypto.randomUUID()
      setSel(id)
      mudarTokens(ts => [...ts, { id, label: `Inimigo ${n}`, initial: 'I', x: cel(p.x) * CELL + 20, y: cel(p.y) * CELL + 20, type: 'enemy', color: '#5a1a14', cond: [] }], true)
    }
  }
  const tokDown = (t: Token, e: RPointerEvent) => {
    if (tool !== 'select' || mapEdit) return
    e.stopPropagation()
    setSel(t.id)
    if (t.type === 'player' && d.membros.some(m => m.id === t.id && m.char)) setSheet(t.id)
    if (!podeMover(t)) return
    const p = pt(e)
    setDrag({ id: t.id, ox: p.x - (t.x - 20), oy: p.y - (t.y - 20), px: t.x - 20, py: t.y - 20 })
  }

  // ── Iniciativa: ordem, vez e rodada ficam nos tokens (todos veem pela sondagem) ──
  const order = tokens.filter(t => t.type !== 'npc' && typeof t.ini === 'number').sort((a, b) => b.ini! - a.ini!)
  const curIdx = Math.max(0, order.findIndex(t => t.vez))
  const cur = order[curIdx]
  const round = cur?.rodada ?? 1
  const irPara = (k: number, rodada: number) => {
    const alvo = order[k]?.id
    mudarTokens(ts => ts.map(t => ({ ...t, vez: t.id === alvo ? true : undefined, rodada: t.id === alvo ? rodada : undefined })))
  }
  const des = (memberId: string) => {
    const a = d.membros.find(m => m.id === memberId)?.char?.attrs.find(x => x.n === 'Destreza')
    return a && isD20Category(d.categoria) ? attributeModifier(a.v, d.categoria) : 0
  }
  const rolarIniciativa = () => {
    const ts = st.current.tokens.map(t => t.type === 'npc' ? t : { ...t, ini: 1 + Math.floor(Math.random() * 20) + (t.type === 'player' ? des(t.id) : 0), vez: undefined, rodada: undefined })
    const first = ts.filter(t => t.type !== 'npc').sort((a, b) => b.ini! - a.ini!)[0]
    mudarTokens(() => ts.map(t => t.id === first?.id ? { ...t, vez: true, rodada: 1 } : t))
  }

  // ── Fichas ──
  const sheetM = d.membros.find(m => m.id === sheet && m.char)
  const d20 = isD20Category(d.categoria)
  const sheetAttrs = sheetM?.char ? (d20
    ? [...sheetM.char.attrs].sort((a, b) => { const ia = ORDEM.indexOf(a.n), ib = ORDEM.indexOf(b.n); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) })
    : sheetM.char.attrs).slice(0, 9) : []

  // ── Valores do template ──
  const selT = tokens.find(t => t.id === sel)
  const temHp = (t: Token) => d.temPv && typeof t.hp === 'number' && !!t.maxHp
  const pctOf = (t: Token) => temHp(t) ? Math.max(0, Math.min(100, Math.round(t.hp! / t.maxHp! * 100))) : 100
  const escondido = (t: Token) => pv && t.type === 'enemy' && nevoa.some(f => f.on && cel(t.x) >= f.x && cel(t.x) < f.x + f.w && cel(t.y) >= f.y && cel(t.y) < f.y + f.h)
  const segundos = d.sessao && agora ? Math.max(0, Math.floor(((ended ?? (ativa ? agora : new Date(d.sessao.inicio).getTime())) - new Date(d.sessao.inicio).getTime()) / 1000)) : 0
  const timer = `${p2(Math.floor(segundos / 3600))}:${p2(Math.floor(segundos / 60) % 60)}:${p2(segundos % 60)}`
  const ms = measure
  const msD = ms ? (() => { const cells = Math.max(Math.abs(ms.x2 - ms.x1), Math.abs(ms.y2 - ms.y1)) / CELL; return { ...ms, mx: (ms.x1 + ms.x2) / 2, my: (ms.y1 + ms.y2) / 2, label: `${cells} quadr. · ${(cells * 1.5).toFixed(1).replace('.', ',')} m · ${cells * 5} ft` } })() : { x1: 0, y1: 0, x2: 0, y2: 0, mx: 0, my: 0, label: '' }
  const selLeft = selT ? selT.x - 20 : 0, selTop = selT ? selT.y - 20 : 0
  const pop = { x: Math.min(W - 260, selLeft + 50), y: Math.max(4, Math.min(H - 240, selTop - 20)) }
  const ePct = selT ? pctOf(selT) : 0
  const selEsconde = !!selT && !gm && selT.type === 'enemy'
  const nomeSessao = d.sessao ? d.sessao.nome : 'Sem sessão'
  const musicaAtual = PRESETS.find(p => p.youtubeId === (musica ?? ultima))
  const tocando = !!musica && !mudo
  const playersOnline = d.membros.filter(m => online.includes(m.id)).length
  const rl = roll
  const vazio = () => {}

  const encerrar = async () => {
    const r = await fetch(`${api}/sessions/end`, { method: 'POST' }).catch(() => null)
    if (!r?.ok) { setEndErro(true); return }
    setEndErro(false)
    setEnded(Date.now())
  }

  return {
    $href: (link: string) => dcHref(link, ctx),
    $img: (id: string) => id === 'mesa-musica-capa' ? ((musica ?? ultima) ? `https://i.ytimg.com/vi/${musica ?? ultima}/hqdefault.jpg` : null) : null,
    voltarHref: `/campaign/${d.campaignId}`,
    campanha: d.campanha, sceneName: nomeSessao,
    toggleTema, timer, scenes: [] as { n: string; thumb: string; go: () => void; bg: string; ring: string; color: string }[],
    members: d.membros.map(m => {
      const on = online.includes(m.id), q = quem.get(m.u)
      return { n: m.char && m.role !== 'GM' ? `${m.u} · ${m.char.n}` : m.u, i: (m.u[0] ?? '?').toUpperCase(), bg: q?.c ?? GM_COR, dot: on ? '#6a9a4a' : 'var(--line)', op: on ? 1 : .45 }
    }),
    onlineLabel: `${playersOnline}/${d.membros.length}`,
    souMestre: gm,
    togglePV: () => setPv(p => !p), pvLabel: pv ? 'Visão do jogador' : 'Visão do mestre', pvIcon: pv ? Eye : Crown, pvBg: pv ? 'var(--accent-t)' : 'transparent', pvRing: pv ? 'var(--accent)' : 'var(--line)', pvColor: pv ? 'var(--accent)' : 'var(--ink)',
    toggleMapEdit: () => {
      if (mapEdit) {
        const url = mapDraft.trim() ? safeImageUrl(mapDraft.trim()) : mapa
        if (mapDraft.trim() && !url) { avisar('Link de imagem inválido · use um endereço https'); return }
        if (url !== mapa) { setMapa(url); setMapSize({ w: 0, h: 0 }); if (ativa) void patch(d.campaignId, { mapImageUrl: url }) }
        setMapDraft('')
      } else setMapDraft(mapa ?? '')
      setMapEdit(!mapEdit); setSel(null)
    },
    meLabel: mapEdit ? 'Concluir mapa' : 'Trocar mapa', meBg: mapEdit ? 'var(--gold-t)' : 'transparent',
    mapEdit, mapDraft, onMapDraft: (e: ChangeEvent<HTMLInputElement>) => setMapDraft(e.target.value),
    tirarMapa: () => { setMapa(null); setMapDraft(''); setMapSize({ w: 0, h: 0 }); if (ativa) void patch(d.campaignId, { mapImageUrl: null }) },
    tools: toolsOk.map(k => ({ l: TOOLS[k][0], icon: TOOLS[k][1], k: TOOLS[k][2], go: () => { setTool(k); setMeasure(null) }, bg: tool === k ? 'var(--accent)' : 'transparent', color: tool === k ? '#fff8f0' : 'var(--muted)', hover: tool === k ? 'var(--accent)' : 'var(--surface2)' })),
    toolIcon: mapEdit ? ImageUp : TOOLS[tool][1],
    toolHint: aviso ?? (mapEdit ? 'Cole o link da imagem do mapa e clique em Concluir mapa' : !ativa ? 'Nenhuma sessão ao vivo · o Mestre inicia pelo Painel' : TOOLS[tool][3]),
    zoom, zoomLabel: `${Math.round(zoom * 100)}%`,
    zoomIn: () => setZoom(z => Math.min(1.8, +(z + .1).toFixed(2))), zoomOut: () => setZoom(z => Math.max(.5, +(z - .1).toFixed(2))),
    onWheel: (e: WheelEvent) => setZoom(z => Math.max(.5, Math.min(1.8, +(z + (e.deltaY < 0 ? .08 : -.08)).toFixed(2)))),
    panX: pan.x, panY: pan.y, boardTr: panning ? 'none' : 'transform .2s ease-out',
    vpCursor: tool === 'pan' ? (panning ? 'grabbing' : 'grab') : tool === 'select' ? 'default' : 'crosshair',
    vpRef, boardRef, vpDown, stop: (e: { stopPropagation: () => void }) => e.stopPropagation(),
    boardW: W, boardH: H, terrain: TERRENO, mapa: safeImageUrl(mapa), onMapLoad: (e: { currentTarget: HTMLImageElement }) => setMapSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight }),
    slotZ: mapEdit ? 60 : 1, slotOutline: mapEdit ? '3px dashed #f0d060' : 'none',
    fog: [...nevoa.map(f => ({
      x: f.x * CELL, y: f.y * CELL, w: f.w * CELL, h: f.h * CELL, label: f.on ? f.label : `${f.label} · revelada`, op: f.on ? 1 : (tool === 'fog' ? .35 : 0),
      bg: f.on ? (pv ? '#120c08' : 'rgb(18 12 8/.62)') : 'rgb(18 12 8/.15)', blur: f.on ? 'blur(2px)' : 'none', pe: (tool === 'fog' ? 'auto' : 'none') as 'auto' | 'none',
      outline: tool === 'fog' ? '2px dashed rgb(240 208 96/.7)' : 'none', lblOp: tool === 'fog' || !pv ? 1 : 0,
      go: () => setNevoa(prev => prev.map(x => x.id === f.id ? { ...x, on: !x.on } : x)),
      remove: (e: { preventDefault: () => void }) => { e.preventDefault(); setNevoa(prev => prev.filter(x => x.id !== f.id)) },
    })), ...(fogDraw ? [{
      x: Math.min(fogDraw.x1, fogDraw.x2) * CELL, y: Math.min(fogDraw.y1, fogDraw.y2) * CELL, w: (Math.abs(fogDraw.x2 - fogDraw.x1) + 1) * CELL, h: (Math.abs(fogDraw.y2 - fogDraw.y1) + 1) * CELL,
      label: `Área ${nevoa.length + 1}`, op: .6, bg: 'rgb(18 12 8/.62)', blur: 'none', pe: 'none' as 'auto' | 'none', outline: '2px dashed rgb(240 208 96/.7)', lblOp: 1, go: vazio, remove: vazio,
    }] : [])],
    tokens: tokens.map(t => {
      const dr = drag && drag.id === t.id, pct = pctOf(t), oculto = (pv || !gm) && t.type === 'enemy'
      return {
        ...t, i: t.initial, c: t.color, left: dr ? drag.px : t.x - 20, top: dr ? drag.py : t.y - 20, z: dr ? 50 : sel === t.id ? 25 : 10,
        tr: dr ? 'none' : 'left .25s cubic-bezier(.3,1.3,.5,1), top .25s cubic-bezier(.3,1.3,.5,1)',
        cursor: tool === 'select' ? (dr ? 'grabbing' : podeMover(t) ? 'grab' : 'pointer') : 'inherit', pe: (tool === 'select' && !mapEdit ? 'auto' : 'none') as 'auto' | 'none', op: escondido(t) ? 0 : 1,
        pct: oculto || !temHp(t) ? 100 : pct, hpC: oculto || !temHp(t) ? 'rgb(0 0 0/.35)' : hpC(pct), c2: t.type === 'enemy' ? '#a83a2a' : t.type === 'npc' ? '#5a9aaa' : '#f0c890',
        turn: cur && cur.id === t.id ? 'mesa-turnGlow 1.8s ease-in-out infinite' : 'none', sel: sel === t.id, showName: sel === t.id || !!dr || (!!cur && cur.id === t.id), hasCond: (t.cond?.length ?? 0) > 0,
        img: safeImageUrl(t.imageUrl ?? null),
        down: (e: RPointerEvent) => tokDown(t, e),
      }
    }),
    hasMeasure: !!ms, ms: msD, pings,
    hasSel: !!selT && !drag,
    sel: {
      i: selT?.initial ?? '', c: selT?.color ?? '', label: selT?.label ?? '',
      kind: selT ? (selT.type === 'enemy' ? 'Inimigo' : selT.type === 'npc' ? 'NPC' : 'Jogador') + (selT.cond?.length ? ` · ${selT.cond.join(', ')}` : '') : '',
      hasHp: !!selT && temHp(selT), hpText: selT && temHp(selT) ? (selEsconde ? '?' : `${selT.hp} / ${selT.maxHp}`) : '', pct: selEsconde ? 100 : ePct, hpC: selEsconde ? 'var(--line)' : hpC(ePct),
      atk: dice.mod ? sg(dice.mod) : '', podeRolar: !!selT && (gm || selT.id === d.meuId),
    },
    pop, deselect: () => setSel(null),
    hpBtns: [-5, -1, 1, 5].map(dd => ({ l: dd > 0 ? `+${dd}` : `${dd}`, bg: dd < 0 ? 'color-mix(in oklab, #c8424c 14%, transparent)' : 'color-mix(in oklab, var(--ok) 16%, transparent)', color: dd < 0 ? '#c8424c' : 'var(--ok)', go: () => mudarTokens(ts => ts.map(t => t.id === sel && typeof t.hp === 'number' ? { ...t, hp: Math.max(0, Math.min(t.maxHp ?? t.hp, t.hp + dd)) } : t)) })),
    conds: CONDS.map(l => { const on = !!selT?.cond?.includes(l); return { l, bg: on ? '#6b5a8a' : 'transparent', color: on ? '#fff' : 'var(--muted)', ring: on ? '#6b5a8a' : 'var(--line)', go: () => mudarTokens(ts => ts.map(t => t.id === sel ? { ...t, cond: on ? (t.cond ?? []).filter(x => x !== l) : [...(t.cond ?? []), l] } : t)) } }),
    attack: () => { if (selT) void rolar({ n: 1, d: 20, mod: dice.mod, adv: dice.adv, who: primeiro(selT.label), what: 'Ataque' }) },
    removeTok: () => { const id = sel; setSel(null); mudarTokens(ts => ts.filter(t => t.id !== id), true) },
    dice: [4, 6, 8, 10, 12, 20, 100].map(n => ({ die: `d${n}`, go: () => setDice(s => ({ ...s, d: n })), bg: dice.d === n ? 'var(--ink)' : 'var(--surface2)', color: dice.d === n ? 'var(--bg)' : 'var(--ink)' })),
    nLabel: `${dice.n}×`, nDown: () => setDice(s => ({ ...s, n: Math.max(1, s.n - 1) })), nUp: () => setDice(s => ({ ...s, n: Math.min(12, s.n + 1) })),
    mLabel: sg(dice.mod), mDown: () => setDice(s => ({ ...s, mod: Math.max(-99, s.mod - 1) })), mUp: () => setDice(s => ({ ...s, mod: Math.min(99, s.mod + 1) })),
    advs: ([['desv', 'Desv', 'Desvantagem'], ['normal', 'Normal', 'Normal'], ['vant', 'Vant', 'Vantagem']] as const).map(([k, l, tt]) => ({ l, t: tt, go: () => setDice(s => ({ ...s, adv: k })), bg: dice.adv === k ? 'var(--surface)' : 'transparent', color: dice.adv === k ? (k === 'vant' ? 'var(--ok)' : k === 'desv' ? '#c8424c' : 'var(--ink)') : 'var(--muted)', sh: dice.adv === k ? '0 1px 2px rgb(0 0 0/.12)' : 'none' })),
    // TODO(api): rolagens privadas (RollLog.visibility). Até lá o seletor fica escondido e tudo é público.
    temVisibilidade: false, visOpts: [] as { l: string; t: string; icon: LucideIcon; on: boolean; lblD: string; go: () => void; bg: string; color: string; sh: string }[],
    rollBtnLabel: `Rolar ${dice.n}d${dice.d}${dice.mod ? sg(dice.mod) : ''}`, rollBtnBg: 'linear-gradient(180deg,#a8262f,#7a1820)',
    rollNow: () => { void rolar({ ...dice, what: 'Rolagem livre' }) },
    showRoll: !!rl,
    roll: rl ? {
      ...rl, hasVis: false, visL: '', visIcon: Eye, openDone: rl.done, sealedDone: false,
      anim: !rl.done ? 'mesa-diceSpin 1s cubic-bezier(.2,.7,.3,1) both' : rl.crit ? 'mesa-critShake .45s 2' : 'none',
      tag: rl.crit ? 'Crítico!' : rl.fail ? 'Falha crítica' : '', tagColor: rl.crit ? '#f3dc94' : '#e8a080',
    } : { face: '', label: '', crit: false, hasVis: false, visL: '', visIcon: Eye, openDone: false, sealedDone: false, anim: 'none', total: 0, detail: '', tag: '', tagColor: '' },
    tabs: TABS.map(([k, l, ic]) => ({ l, icon: ic, go: () => setTab(k), color: tab === k ? 'var(--accent)' : 'var(--muted)', line: tab === k ? 'inset 0 -2px 0 var(--accent)' : 'none' })),
    tabIni: tab === 'ini', tabFichas: tab === 'fichas', tabLog: tab === 'log', tabMusic: tab === 'music',
    round, iniVazia: order.length === 0,
    ini: order.map(t => {
      const p = pctOf(t), on = cur?.id === t.id, oculto = (pv || !gm) && t.type === 'enemy'
      return { v: t.ini!, i: t.initial, c: t.color, label: t.label, pct: oculto || !temHp(t) ? 100 : p, hpC: oculto ? 'var(--line)' : temHp(t) ? hpC(p) : 'var(--line)', hp: oculto ? '?' : temHp(t) ? `${t.hp}/${t.maxHp}` : '',
        bg: on ? 'var(--gold-t)' : 'transparent', ring: on ? 'var(--gold)' : 'transparent', iniRing: on ? 'var(--gold)' : 'var(--line)', fw: on ? 600 : 500, go: () => setSel(t.id) }
    }),
    nextName: order.length ? primeiro(order[(curIdx + 1) % order.length]!.label) : '',
    nextTurn: () => { if (order.length) irPara((curIdx + 1) % order.length, (curIdx + 1) % order.length === 0 ? round + 1 : round) },
    prevTurn: () => { if (order.length) irPara((curIdx - 1 + order.length) % order.length, curIdx === 0 ? Math.max(1, round - 1) : round) },
    rolarIniciativa,
    party: d.membros.filter(m => m.char && m.role !== 'GM').map(m => {
      const t = tokens.find(x => x.id === m.id), hp = t && typeof t.hp === 'number' ? t.hp : m.char!.hp, max = t?.maxHp ?? m.char!.max
      const p = max > 0 ? Math.max(0, Math.min(100, Math.round(hp / max * 100))) : 100
      return { label: primeiro(m.char!.n), i: (m.char!.n[0] ?? '?').toUpperCase(), c: quem.get(m.u)?.c ?? GM_COR, pct: d.temPv ? p : 100, hpC: d.temPv ? hpC(p) : 'var(--line)', bg: sheet === m.id ? 'var(--accent-t)' : 'transparent', ring: sheet === m.id ? 'var(--accent)' : 'var(--line)', go: () => { setSheet(m.id); if (t) setSel(t.id) } }
    }),
    temFicha: !!sheetM,
    sheet: {
      n: sheetM?.char?.n ?? '', href: sheetM?.char ? `/personagens/${sheetM.char.id}` : '#',
      sub: sheetM?.char ? [sheetM.char.raca, sheetM.char.classe, `Nv ${sheetM.char.nivel}`].filter(Boolean).join(' · ') : '',
      attrs: sheetAttrs.map(a => {
        const who = primeiro(sheetM!.char!.n), pool = attributePool(a.v, a.die), m = attributeModifier(a.v, d.categoria)
        return {
          k: d20 ? sigla(a.n) : a.n.slice(0, 10).toUpperCase(), v: a.v, m: d20 ? sg(m) : `${pool.count}${pool.die}`,
          go: () => { void (d20 ? rolar({ n: 1, d: 20, mod: m, adv: dice.adv, who, what: a.n }) : rolar({ n: pool.count, d: Number(pool.die.slice(1)), mod: 0, adv: 'normal', who, what: a.n })) },
        }
      }),
      skills: [] as { n: string; v: string; go: () => void }[],
    },
    nRolls,
    log: log.map(l => {
      const [a, ...b] = (l.attribute ?? '').split(' · ')
      const q = quem.get(l.rolledBy), crit = /^1?d20/i.test(l.expression) && l.rolls[0] === 20
      const who = b.length ? a! : (q?.n ?? l.rolledBy), what = b.length ? b.join(' · ') : (l.attribute || l.expression)
      return {
        id: l.id, who, i: (who[0] ?? '?').toUpperCase(), c: q?.c ?? GM_COR, whatS: what, detailS: `${detalhe(l)}${agora ? ` · ${hhmm(l.rolledAt)}` : ''}`, total: l.total,
        color: crit ? 'var(--accent)' : 'var(--ink)', anim: l.id === fresh ? 'mesa-logIn .5s both' : 'none',
        hasVis: false, visL: '', visIcon: Eye, visBg: '', visC: '', showTotal: true, sealed: false, avOp: 1, rowBg: 'transparent', canReveal: false, reveal: vazio,
      }
    }),
    togglePlay: () => {
      if (gm) tocar(musica ? null : ultima ?? PRESETS[0]!.youtubeId)
      else setMudo(m => !m)
    },
    playIcon: tocando ? Pause : Play,
    track: musicaAtual?.title ?? ((musica ?? ultima) ? 'Link do YouTube' : 'Nenhuma trilha tocando'),
    eqBars: [.8, .6, 1, .7].map((dd, k) => ({ a: tocando ? `mesa-eq ${dd}s ${k * .12}s ease-in-out infinite` : 'none' })),
    vol, onVol: (e: ChangeEvent<HTMLInputElement>) => {
      const v = +e.target.value
      setVol(v)
      if (gm && ativa) { clearTimeout(volT.current); volT.current = setTimeout(() => { void patch(d.campaignId, { musicVolume: v }) }, 500) }
    },
    tracks: PRESETS.map(p => ({ n: p.title, d: p.mood.toLowerCase(), go: () => tocar(p.youtubeId), bg: musica === p.youtubeId ? 'var(--accent-t)' : 'transparent', dot: musica === p.youtubeId ? 'var(--accent)' : 'var(--line)' })),
    linkMusica, onLinkMusica: (e: ChangeEvent<HTMLInputElement>) => setLinkMusica(e.target.value),
    tocarLink: () => { const id = ytId(linkMusica.trim()); if (!id) { avisar('Link do YouTube inválido'); return } tocar(id); setLinkMusica('') },
    musicaSrc: musica ? `https://www.youtube-nocookie.com/embed/${musica}?autoplay=1&loop=1&playlist=${musica}&controls=0&disablekb=1&modestbranding=1&enablejsapi=1` : null,
    iframeRef, onMusicaLoad: () => { yt('setVolume', [vol]); if (mudo) yt('pauseVideo') },
    podeEncerrar: gm && ativa,
    endOpen, ended: ended !== null, notEnded: ended === null,
    endAsk: () => setEndOpen(true), endCancel: () => { setEndOpen(false); setEndErro(false) }, endConfirm: () => { void encerrar() },
    endTitle: ended !== null ? `${nomeSessao} selada` : `Encerrar a ${nomeSessao}?`,
    endSub: ended !== null ? 'O registro ficou salvo. Escreva o resumo na página da sessão.' : endErro ? 'Não foi possível encerrar. Tente de novo.' : 'O registro e a posição dos tokens ficam salvos.',
    resumoHref: d.sessao ? `/campaign/${d.campaignId}/sessions/${d.sessao.id}` : `/campaign/${d.campaignId}`,
  }
}

export type Vals = ReturnType<typeof useMesaVals>
