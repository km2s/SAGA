'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent as RPointerEvent, type WheelEvent } from 'react'
import {
  CirclePlus, CloudFog, Crown, Eye, Hand, Image as ImageIcon, ImageUp, Lock, MessagesSquare, MousePointer2, Move, Music, Pause, Play, RadioTower, Ruler, ScrollText, Swords,
  EyeOff, Flame, Globe, UserRound, Wifi, WifiOff, type LucideIcon,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { dcHref } from '@/lib/dc-routes'
import { toggleTema } from '@/lib/tema'
import { safeImageUrl } from '@/lib/safe-url'
import { attributeModifier, attributePool, isD20Category, type SheetCategory } from '@/lib/system-category'
import { PRESETS } from '@/components/mesa/MusicPlayer'
import { miniatura, type MapaItem, type SagaMapasProps } from '@/components/screens/sagamapas/vals'
import { enviarImagem, imagemDe } from '@/lib/enviar-imagem'
import { PLAYER_COLORS, initTokens, type Marker, type Member, type RollLogEntry, type SessionState, type Token } from '@/components/mesa/types'

type Ficha = { ca: number | null; attrs: { n: string; v: number; die: string }[]; armas: { n: string; b: number; d: string }[] | null; nota: string | null }

/** Dados reais de /campaign/[id]/mesa (app/(app)/campaign/[id]/mesa/page.tsx). */
export type MesaDados = {
  campaignId: string; campanha: string; souMestre: boolean; meuId: string
  categoria: SheetCategory; temPv: boolean
  sessao: null | {
    id: string; nome: string; numero: number; ativa: boolean; inicio: string
    tokensJson: string | null; mapa: string | null; musica: string | null; volume: number; liveJson: string | null
  }
  membros: {
    id: string; role: string; u: string
    char: null | ({ id: string; n: string; raca: string | null; classe: string | null; nivel: number; hp: number; max: number; img: string | null } & Ficha)
  }[]
  npcs: ({ id: string; n: string; type: string; hp: number; max: number; img: string | null } & Ficha)[]
  handouts: Handout[]
  rolagens: RollLogEntry[]
  totalRolagens: number
  /** Névoa do mapa na mesa (Mapa.nevoaJson; o jogador recebe só as áreas cobertas). */
  nevoa: string | null
  /** Próxima sessão agendada ("Sessão IV · sábado 14/11 · 20h"). */
  proxima: string | null
  /** SAGA Mapas: mestre recebe todos; jogador, só o que está na mesa. `aberto` vem de ?mapa=. */
  mapas: MapaItem[]; naMesa: string; aberto: string
  /** Campaign.rollVisibility: todos · mestre · escolha. */
  regraRolagens: string
}

type Handout = { id: string; t: string | null; x: string | null; img: string | null; at: string; por: string; vistos: string[] }
type Tool = 'select' | 'pan' | 'token' | 'ping' | 'measure' | 'fog'
type Pend = { label: string; i: string; type: Token['type']; c: string; hp?: number; max?: number; ca?: number | null; npc?: string; img?: string | null }
type Nevoa = { id: string; label: string; x: number; y: number; w: number; h: number; on: boolean }
// Rolagens privadas (README do redesign): chaves do design → enum do banco.
type VisKey = 'pub' | 'secret' | 'self' | 'gm' | 'blind'
const VIS: Record<VisKey, [string, LucideIcon, string]> = {
  pub: ['Pública', Globe, 'Todos na mesa veem'], secret: ['Secreta', EyeOff, 'Só você, Mestre, vê o resultado'], self: ['Só para mim', UserRound, 'Só você vê: nem o Mestre'],
  gm: ['Para o Mestre', Crown, 'Você e o Mestre veem'], blind: ['Às cegas', EyeOff, 'Só o Mestre vê o resultado: nem você'],
}
const VIS_API: Record<VisKey, string> = { pub: 'PUBLIC', secret: 'GM_SECRET', self: 'SELF', gm: 'GM', blind: 'BLIND' }
const VIS_DE: Record<string, VisKey> = { PUBLIC: 'pub', GM_SECRET: 'secret', SELF: 'self', GM: 'gm', BLIND: 'blind' }
type Rolagem = { face: string | number; label: string; done: boolean; total?: number; detail?: string; crit?: boolean; fail?: boolean; vis?: VisKey; sealed?: boolean }

const CELL = 40
const GM_COR = '#b98a2a'
const CONDS = ['Envenenado', 'Caído', 'Agarrado', 'Oculto']
const TERRENO = 'radial-gradient(ellipse 18% 22% at 20% 30%, rgb(70 90 40/.35), transparent 70%),radial-gradient(ellipse 14% 18% at 70% 80%, rgb(70 90 40/.3), transparent 70%),linear-gradient(110deg, transparent 44%, rgb(70 110 130/.45) 45%, rgb(90 130 150/.5) 52%, transparent 53%),radial-gradient(ellipse at 50% 45%, #ead8b0, #d6bc86 75%, #b8955c)'
const TOOLS: Record<Tool, [string, LucideIcon, string, string]> = {
  select: ['Selecionar e mover', MousePointer2, 'V', 'Arraste tokens · clique para ver detalhes'],
  pan: ['Mover mapa', Hand, 'H', 'Arraste para mover o mapa · role para zoom'],
  token: ['Novo token', CirclePlus, 'T', 'Escolha um NPC salvo ou crie um token avulso'],
  ping: ['Ping', RadioTower, 'P', 'Clique para marcar um ponto para todos'],
  measure: ['Régua', Ruler, 'R', 'Arraste para medir · 1 quadrado = 1,5 m'],
  fog: ['Névoa', CloudFog, 'F', 'Arraste para cobrir uma área · clique nela para revelar ou esconder'],
}
const KEYS: Record<string, Tool> = { v: 'select', h: 'pan', t: 'token', p: 'ping', r: 'measure', f: 'fog' }
const TABS: [string, string, LucideIcon][] = [['ini', 'Iniciativa', Swords], ['fichas', 'Fichas', ScrollText], ['log', 'Chat', MessagesSquare], ['hand', 'Handouts', ImageIcon], ['music', 'Música', Music]]
const AB: [string, string][] = [['Força', 'FOR'], ['Destreza', 'DES'], ['Constituição', 'CON'], ['Inteligência', 'INT'], ['Sabedoria', 'SAB'], ['Carisma', 'CAR']]
const SK: [string, string][] = [['Acrobacia', 'DES'], ['Arcanismo', 'INT'], ['Atletismo', 'FOR'], ['Atuação', 'CAR'], ['Enganação', 'CAR'], ['Furtividade', 'DES'], ['História', 'INT'], ['Intimidação', 'CAR'], ['Intuição', 'SAB'], ['Investigação', 'INT'], ['Lidar com Animais', 'SAB'], ['Medicina', 'SAB'], ['Natureza', 'INT'], ['Percepção', 'SAB'], ['Persuasão', 'CAR'], ['Prestidigitação', 'DES'], ['Religião', 'INT'], ['Sobrevivência', 'SAB']]
// Tipos de NPC do banco → rótulo, cor e tipo de token (cores do design; os sem cor própria herdam como na tela NPCs).
const NT: Record<string, [string, string, Token['type']]> = {
  VILLAIN: ['Vilão', '#8a1c24', 'enemy'], ENEMY: ['Inimigo', '#8a1c24', 'enemy'], ALLY: ['Aliado', '#4f7a3a', 'npc'], MERCHANT: ['Mercador', '#9c7a2a', 'npc'],
  MOUNT: ['Montaria', '#3a6a7a', 'npc'], NEUTRAL: ['Neutro', '#76695a', 'npc'], FAMILIAR: ['Familiar', '#76695a', 'npc'], SERVANT: ['Servo', '#76695a', 'npc'], OTHER: ['Outro', '#76695a', 'npc'],
}
const FT: Record<Token['type'], [string, string]> = { player: ['Jogador', '#b8492a'], enemy: ['Inimigo', '#5a1a14'], npc: ['NPC', '#3a6a7a'] }
const ART_CARTA = 'repeating-linear-gradient(180deg, transparent 0 13px, rgb(120 80 30/.18) 13px 14px), linear-gradient(160deg,#f6ead0,#e2cfa4)'
const json = (url: string, method: string, body?: unknown) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).catch(() => null)
type HandoutApi = { id: string; title: string | null; content: string | null; imageUrl: string | null; createdAt: string; sharedBy?: { user?: { username?: string } }; seenBy?: unknown[]; vistos?: string[] }

const hpC = (p: number) => p > 50 ? '#6a9a4a' : p > 25 ? '#d9a22a' : '#c8424c'
const sg = (v: number) => (v >= 0 ? '+' : '') + v
const p2 = (n: number) => String(n).padStart(2, '0')
const hhmm = (iso: string) => { const d = new Date(iso); return `${p2(d.getHours())}:${p2(d.getMinutes())}` }
const primeiro = (s: string) => s.split(/[ ,]/)[0] || s
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
  const [, setMapSize] = useState({ w: 0, h: 0 })
  // SAGA Mapas: a sessão espelha o mapa "na mesa"; o mestre pode abrir outro para preparar
  // (tokens e imagem vão para o registro do mapa, os jogadores não veem).
  const [mapas, setMapas] = useState<MapaItem[]>(d.mapas)
  const [naMesa, setNaMesa] = useState(d.naMesa)
  const [aberto, setAberto] = useState(d.naMesa)
  const [mapsOpen, setMapsOpen] = useState(false)
  const outro = gm && aberto !== naMesa
  const abertoRef = useRef({ id: aberto, outro })
  abertoRef.current = { id: aberto, outro }
  // Último estado conhecido da sessão (null = desconhecido: lê o registro do mapa).
  const sessaoRef = useRef<{ tokens: string | null; mapa: string | null } | null>({ tokens: d.sessao?.tokensJson ?? null, mapa: d.sessao?.mapa ?? null })
  const mapaAberto = mapas.find(m => m.id === aberto) ?? mapas[0] ?? { id: '', nome: 'Mapa', colunas: 30, linhas: 20, escala: 0, arte: 0, imagemUrl: null }
  const [tokens, setTokens] = useState<Token[]>(() => parse<Token[] | null>(d.sessao?.tokensJson, null) ?? initTokens(membrosMesa))
  const [live, setLive] = useState<string[]>(() => parse<string[]>(d.sessao?.liveJson, []))
  const [tab, setTab] = useState('ini')
  const [sheet, setSheet] = useState<string | null>(() => (d.membros.find(m => m.id === d.meuId && m.char) ?? d.membros.find(m => m.char && m.role !== 'GM'))?.id ?? null)
  const [dice, setDice] = useState({ n: 1, d: 20, mod: 0, adv: 'normal' })
  // Regra da campanha: "todos" e "mestre" fixam o modo do jogador (o servidor confere).
  const regraPl: VisKey | null = d.regraRolagens === 'todos' ? 'pub' : d.regraRolagens === 'mestre' ? 'gm' : null
  const [rollVis, setRollVis] = useState<{ gm: VisKey; pl: VisKey }>({ gm: 'pub', pl: regraPl ?? 'pub' })
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
  // Mesa sem sessão: preparo do mestre e o tutorial (SAGA Mesa, Tweaks sessao/tour).
  const router = useRouter()
  const [prep, setPrep] = useState(false)
  const [iniciando, setIniciando] = useState(false)
  const gravaPreparo = gm && !ativa && prep && !!d.sessao
  const [tourStep, setTourStep] = useState(-1)
  const [tourRect, setTourRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  // Ao vivo, adicionar token, chat, handouts e ficha lateral.
  const [liveOpen, setLiveOpen] = useState(false)
  const [liveExp, setLiveExp] = useState<string | null>(null)
  const [lockTick, setLockTick] = useState(0)
  const [addTab, setAddTab] = useState<'npc' | 'free'>('npc')
  const [pend, setPend] = useState<Pend | null>(null)
  const [freeName, setFreeName] = useState('')
  const [freeType, setFreeType] = useState<Token['type']>('enemy')
  const [chatIn, setChatIn] = useState('')
  const [fsTab, setFsTab] = useState('attr')
  const [notas, setNotas] = useState<Record<string, string>>({})
  const [noteSt, setNoteSt] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [hf, setHf] = useState({ t: '', x: '', u: '' })
  const [hands, setHands] = useState<Handout[]>(d.handouts)
  const [openHand, setOpenHand] = useState<string | null>(null)
  const [freshHand, setFreshHand] = useState<string | null>(null)
  const noteT = useRef<ReturnType<typeof setTimeout>[]>([])

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
  const pendRef = useRef<(() => void) | null>(null)

  const podeSync = gm || live.includes(d.meuId)
  const podeMover = useCallback((t: Token) => gm || (live.includes(d.meuId) && (t.id === d.meuId || !!t.allowedPlayers?.includes(d.meuId))), [gm, live, d.meuId])
  const avisar = (txt: string) => { setAviso(txt); const t = setTimeout(() => setAviso(null), 3200); timers.current.push(t) }

  // Grava os tokens na sessão. `logo` = soltar um token; o resto espera 400 ms
  // (o PATCH tem limite de 30/min por pessoa).
  const salvarTokens = useCallback((next: Token[], logo = false) => {
    editRef.current = Date.now()
    const ab = abertoRef.current
    const agenda = (send: () => void) => {
      clearTimeout(syncT.current)
      const fn = () => { pendRef.current = null; send() }
      if (logo) fn(); else { pendRef.current = fn; syncT.current = setTimeout(fn, 400) }
    }
    // Mapa que os jogadores não veem: grava no registro do mapa.
    if (ab.outro) { agenda(() => { void json(`/api/campaigns/${d.campaignId}/mapas/${ab.id}`, 'PATCH', { tokensJson: JSON.stringify(next) }) }); return }
    sessaoRef.current = { tokens: JSON.stringify(next), mapa: sessaoRef.current?.mapa ?? null }
    // Modo preparo (mestre, sem sessão ao vivo): grava na última sessão, que a próxima copia ao iniciar.
    if (!(ativa || gravaPreparo) || !podeSync) return
    agenda(() => { void patch(d.campaignId, { tokensJson: JSON.stringify(next) }) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativa, podeSync, d.campaignId, prep])
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
  // Névoa por mapa no servidor (Mapa.nevoaJson): o mestre grava; o jogador recebe só as
  // áreas cobertas do mapa na mesa, pela sondagem. `nevoaDe` = de qual mapa é a névoa em
  // memória (trocar de mapa não grava a do anterior no novo).
  const [nevoaDe, setNevoaDe] = useState<string | null>(null)
  const nevoaT = useRef<ReturnType<typeof setTimeout>>()
  const carregarNevoa = (id: string, raw: string | null | undefined) => {
    let lida = parse<Nevoa[] | null>(raw, null)
    // Névoa antiga, guardada só no navegador do mestre: sobe para o mapa na primeira vez.
    if (!lida && gm) try {
      const v = localStorage.getItem(`saga-mesa-nevoa-${id}`) ?? (d.sessao && id === d.naMesa ? localStorage.getItem(`saga-mesa-nevoa-${d.sessao.id}`) : null)
      if (v) lida = JSON.parse(v) as Nevoa[]
    } catch { /* sem storage */ }
    setNevoa(lida ?? []); setNevoaDe(id)
  }
  useEffect(() => { carregarNevoa(d.naMesa, d.nevoa) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!gm || !nevoaDe || nevoaDe !== aberto) return
    clearTimeout(nevoaT.current)
    const id = nevoaDe, v = JSON.stringify(nevoa)
    nevoaT.current = setTimeout(() => { void json(`${api}/mapas/${id}`, 'PATCH', { nevoaJson: v }) }, 600)
  }, [nevoa]) // eslint-disable-line react-hooks/exhaustive-deps
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
        // Revelações voltam com o rolledAt antigo: o "desde" nunca anda para trás.
        if (novas[0]!.rolledAt > sinceRef.current) sinceRef.current = novas[0]!.rolledAt
        const ids = new Set(st.current.log.map(x => x.id))
        const add = novas.filter(x => !ids.has(x.id)), muda = novas.filter(x => ids.has(x.id))
        if (add.length || muda.length) {
          setLog(prev => [...add, ...prev.map(x => muda.find(m => m.id === x.id) ?? x)].slice(0, 80))
          setNRolls(n => n + add.filter(x => x.expression !== 'chat').length)
        }
      }
      const s = j?.sessionState
      if (!s) return
      const fora = abertoRef.current.outro
      if (fora || Date.now() - editRef.current > 6000) sessaoRef.current = { tokens: s.tokensJson, mapa: s.mapImageUrl }
      if (!fora && !st.current.drag && Date.now() - editRef.current > 6000 && s.tokensJson) {
        const ts = parse<Token[] | null>(s.tokensJson, null)
        if (ts) setTokens(ts)
      }
      if (!fora) setMapa(s.mapImageUrl)
      // O mapa na mesa mudou (outra aba do mestre) ou foi redimensionado.
      const sm = s.mapa
      if (sm) {
        if (gm) setNaMesa(sm.id)
        else {
          setMapas([sm]); setNaMesa(sm.id); setAberto(sm.id)
          // Névoa do mapa na mesa (só as áreas cobertas).
          setNevoa(parse<Nevoa[]>(sm.nevoaJson ?? null, []))
        }
      }
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
  useEffect(() => () => { timers.current.forEach(clearTimeout); noteT.current.forEach(clearTimeout); clearTimeout(syncT.current) }, [])
  // Handouts novos do mestre chegam a cada 15 s.
  const lerHandouts = useCallback(async () => {
    const r = await fetch(`${api}/handouts`).catch(() => null)
    const j = r?.ok ? await r.json().catch(() => null) as HandoutApi[] | null : null
    if (!j) return
    setHands(j.map(h => ({
      id: h.id, t: h.title, x: h.content, img: h.imageUrl, at: new Date(h.createdAt).toISOString(), por: h.sharedBy?.user?.username ?? '',
      vistos: h.vistos ?? ((h.seenBy?.length ?? 0) > 0 ? [d.meuId] : []),
    })))
  }, [api, d.meuId])
  useEffect(() => {
    const iv = setInterval(() => { void lerHandouts() }, 15_000)
    return () => clearInterval(iv)
  }, [lerHandouts])

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
  // Tabuleiro = colunas × linhas do mapa aberto.
  const W = mapaAberto.colunas * CELL, H = mapaAberto.linhas * CELL
  const dims = useRef({ W, H }); dims.current = { W, H }
  const vpZoomMin = .25
  const ajustar = () => {
    const r = vpRef.current?.getBoundingClientRect()
    if (!r || !r.width || !r.height) return
    const z = +Math.max(vpZoomMin, Math.min(1.8, Math.min((r.width - 48) / W, (r.height - 48) / H))).toFixed(2)
    setZoom(z); setPan({ x: Math.round((r.width - W * z) / 2), y: Math.round((r.height - H * z) / 2) })
  }
  // Abrir um mapa (ou mudar o tamanho dele) já ajusta à tela.
  useEffect(() => { ajustar() }, [aberto, W, H]) // eslint-disable-line react-hooks/exhaustive-deps
  const abrirMapa = async (id: string) => {
    if (!gm || !id) return
    // A gravação pendente vai para o mapa de onde se está saindo.
    clearTimeout(syncT.current); pendRef.current?.()
    if (nevoaDe) { clearTimeout(nevoaT.current); void json(`${api}/mapas/${nevoaDe}`, 'PATCH', { nevoaJson: JSON.stringify(nevoa) }) }
    setSel(null); setMeasure(null); setMapEdit(false)
    const r = await fetch(`${api}/mapas/${id}`).catch(() => null)
    const j = r?.ok ? await r.json().catch(() => null) as (MapaItem & { tokensJson: string | null; nevoaJson: string | null }) | null : null
    if (!j) { avisar('Não foi possível abrir o mapa · tente de novo'); return }
    editRef.current = Date.now()
    carregarNevoa(id, j.nevoaJson)
    // Mapa na mesa: tokens e imagem vêm da sessão (o espelho dele); os outros, do registro do mapa.
    const s = sessaoRef.current
    if (id === naMesa && s) {
      setAberto(id); setTokens(parse<Token[] | null>(s.tokens, null) ?? initTokens(membrosMesa)); setMapa(s.mapa)
      return
    }
    setAberto(id); setTokens(parse<Token[] | null>(j.tokensJson, null) ?? (id === naMesa ? initTokens(membrosMesa) : [])); setMapa(j.imagemUrl)
    if (id === naMesa) sessaoRef.current = { tokens: j.tokensJson, mapa: j.imagemUrl }
  }
  // ?mapa= do Painel do Mestre › Mapas: abre direto o mapa escolhido.
  useEffect(() => { if (d.aberto !== d.naMesa) void abrirMapa(d.aberto) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const limite = tokens.length ? { x: Math.max(...tokens.map(t => cel(t.x))), y: Math.max(...tokens.map(t => cel(t.y))) } : null
  const mapasProps: SagaMapasProps = {
    campaignId: d.campaignId, modo: 'mesa', mapas, naMesa, aberto, limite,
    onAbrir: id => { void abrirMapa(id) }, onClose: () => setMapsOpen(false),
    onChange: (ms, nm) => {
      const a = ms.find(m => m.id === aberto)
      // Diminuiu o mapa aberto: o servidor já prendeu os tokens; aqui só acompanha.
      if (a && (a.colunas !== mapaAberto.colunas || a.linhas !== mapaAberto.linhas)) {
        const mx = a.colunas * CELL - 20, my = a.linhas * CELL - 20
        setTokens(ts => ts.map(t => ({ ...t, x: Math.min(mx, t.x), y: Math.min(my, t.y) })))
      }
      if (nm !== naMesa) {
        if (nm === aberto) {
          // O mapa aberto foi para a mesa: a sessão recebe o que está na tela agora.
          clearTimeout(syncT.current); pendRef.current = null
          const tj = JSON.stringify(st.current.tokens)
          sessaoRef.current = { tokens: tj, mapa }
          if (d.sessao) void patch(d.campaignId, { tokensJson: tj })
        } else sessaoRef.current = null
        setNaMesa(nm)
      }
      setMapas(ms)
    },
  }
  // Imagem do mapa aberto (o PATCH do mapa na mesa também atualiza a sessão).
  const gravarImagem = (url: string | null) => {
    setMapa(url); setMapSize({ w: 0, h: 0 })
    setMapas(ms => ms.map(m => m.id === aberto ? { ...m, imagemUrl: url } : m))
    if (!outro) sessaoRef.current = { tokens: sessaoRef.current?.tokens ?? JSON.stringify(st.current.tokens), mapa: url }
    if (gm && aberto) void json(`${api}/mapas/${aberto}`, 'PATCH', { imagemUrl: url })
    else if (ativa || gravaPreparo) void patch(d.campaignId, { mapImageUrl: url })
  }
  // "Trocar mapa" do design: soltar (ou colar) a imagem no mapa. Vai para o bucket e vira a imagem do mapa aberto.
  const soltarRef = useRef<(f: File) => void>(() => {})
  soltarRef.current = (f: File) => {
    if (!gm) return
    avisar('Enviando a imagem do mapa…')
    void enviarImagem(f, { para: 'mapa', campaignId: d.campaignId }).then(r => {
      if ('erro' in r) { avisar(r.erro); return }
      gravarImagem(r.url); setMapDraft(''); setMapEdit(false); avisar('Mapa trocado')
    })
  }
  useEffect(() => {
    const el = vpRef.current
    if (!el || !gm) return
    const over = (e: DragEvent) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault() }
    const drop = (e: DragEvent) => { const f = imagemDe(e.dataTransfer); if (f) { e.preventDefault(); soltarRef.current(f) } }
    // Colar uma imagem só enquanto "Trocar mapa" está aberto (no resto da Mesa, colar é texto).
    const paste = (e: ClipboardEvent) => { if (!mapEditRef.current) return; const f = imagemDe(e.clipboardData); if (f) { e.preventDefault(); soltarRef.current(f) } }
    el.addEventListener('dragover', over); el.addEventListener('drop', drop); window.addEventListener('paste', paste)
    return () => { el.removeEventListener('dragover', over); el.removeEventListener('drop', drop); window.removeEventListener('paste', paste) }
  }, [gm])
  const mapEditRef = useRef(mapEdit); mapEditRef.current = mapEdit

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
        // Preso dentro do tabuleiro do mapa aberto.
        const cx = Math.min(dims.current.W / CELL - 1, Math.max(0, Math.round(g.px / CELL))), cy = Math.min(dims.current.H / CELL - 1, Math.max(0, Math.round(g.py / CELL)))
        if (g.moved) mudarTokens(ts => ts.map(t => t.id === g.id ? { ...t, x: cx * CELL + 20, y: cy * CELL + 20 } : t), true)
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
  const rolar = async (c: { n: number; d: number; mod: number; adv: string; what: string; who?: string }): Promise<RollLogEntry | null> => {
    if (st.current.roll && !st.current.roll.done) return null
    if (!ativa || ended) { avisar('Nenhuma sessão ao vivo · o Mestre inicia pelo Painel'); return null }
    const who = c.who ?? euNome
    const adv = c.d === 20 && c.n === 1 ? c.adv : 'normal'
    const expr = `${c.n}d${c.d}${c.mod ? sg(c.mod) : ''}`
    // Quem vê esta rolagem: o modo escolhido na barra de dados vale para toda rolagem (barra, ficha, popover, /r).
    const vis = gm ? rollVis.gm : rollVis.pl
    setRoll({ face: '?', label: `${who} · ${c.what}`, done: false, vis })
    const spin = setInterval(() => setRoll(r => r && !r.done ? { ...r, face: 1 + Math.floor(Math.random() * c.d) } : r), 70)
    const [res] = await Promise.all([
      fetch(`${api}/rolls`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expression: expr, attribute: `${who} · ${c.what}`, visibility: VIS_API[vis], ...(adv !== 'normal' ? { adv } : {}) }) }).catch(() => null),
      new Promise(r => setTimeout(r, 1000)),
    ])
    clearInterval(spin)
    const e = res?.ok ? await res.json().catch(() => null) as (RollLogEntry & { isCrit?: boolean }) | null : null
    if (!e) {
      setRoll(null)
      avisar(res?.status === 429 ? 'Muitas rolagens seguidas · espere um instante' : 'Não foi possível rolar · tente de novo')
      return null
    }
    const entry: RollLogEntry = { ...e, rolls: e.rolls as number[], rolledAt: new Date(e.rolledAt).toISOString() }
    const nat = c.d === 20 && c.n === 1 ? entry.rolls[0] ?? null : null
    // sinceRef não avança aqui: uma rolagem alheia anterior a esta ainda chega pela sondagem.
    setLog(prev => [entry, ...prev.filter(x => x.id !== entry.id)].slice(0, 50))
    setNRolls(n => n + 1)
    setFresh(entry.id)
    // Às cegas: o servidor não manda o resultado nem para quem rolou; termina no selo.
    if (entry.oculto) setRoll({ face: '?', label: `${who} · ${c.what}`, done: true, vis, sealed: true })
    else setRoll({ face: c.n === 1 ? entry.rolls[0] ?? entry.total : entry.total, label: `${who} · ${c.what}`, done: true, total: entry.total, detail: detalhe(entry), crit: nat === 20, fail: nat === 1, vis })
    const t = setTimeout(() => setRoll(null), 2200)
    timers.current.push(t)
    return entry
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
    // Novo token: escolhido no painel (NPC salvo ou avulso) e posicionado com um clique.
    if (tool === 'token' && gm && pend) {
      const id = crypto.randomUUID(), pd = pend
      setSel(id); setPend(null)
      mudarTokens(ts => [...ts, {
        id, label: pd.label, initial: pd.i, x: cel(p.x) * CELL + 20, y: cel(p.y) * CELL + 20, type: pd.type, color: pd.c, cond: [],
        ...(pd.hp !== undefined ? { hp: pd.hp, maxHp: pd.max } : {}), ca: pd.ca ?? null, npc: pd.npc ?? null, imageUrl: pd.img ?? null,
      }], true)
    }
  }
  const tokDown = (t: Token, e: RPointerEvent) => {
    if (tool !== 'select' || mapEdit) return
    e.stopPropagation()
    setSel(t.id)
    if (t.type === 'player' && d.membros.some(m => m.id === t.id && m.char)) setSheet(t.id)
    else if (t.npc && gm) setSheet(t.npc)
    // Jogador sem permissão: o aviso no mapa balança.
    if (!podeMover(t)) { if (!gm) setLockTick(n => n + 1); return }
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

  // ── Fichas: jogadores com personagem e (para o mestre) NPCs salvos que estão no mapa ──
  const d20 = isD20Category(d.categoria)
  type FichaMesa = Ficha & { key: string; kind: 'player' | 'npc'; charId: string; n: string; sub: string; hp: number; max: number; c: string; tokenId: string | null; dono: boolean }
  const fichas: FichaMesa[] = [
    ...d.membros.filter(m => m.char && m.role !== 'GM').map(m => {
      const ch = m.char!, t = tokens.find(x => x.id === m.id)
      return { ...ch, key: m.id, kind: 'player' as const, charId: ch.id, n: ch.n, sub: [ch.raca, ch.classe, `Nv ${ch.nivel}`].filter(Boolean).join(' · '),
        hp: t && typeof t.hp === 'number' ? t.hp : ch.hp, max: t?.maxHp ?? ch.max, c: quem.get(m.u)?.c ?? GM_COR, tokenId: t?.id ?? null, dono: m.id === d.meuId }
    }),
    ...(gm ? d.npcs.filter(x => tokens.some(t => t.npc === x.id)).map(x => {
      const t = tokens.find(y => y.npc === x.id)!
      return { ...x, key: x.id, kind: 'npc' as const, charId: x.id, sub: `${(NT[x.type] ?? NT.NEUTRAL!)[0]} · ficha do grimório`,
        hp: typeof t.hp === 'number' ? t.hp : x.hp, max: t.maxHp ?? x.max, c: t.color, tokenId: t.id, dono: false }
    }) : []),
  ]
  const fs = fichas.find(f => f.key === sheet) ?? fichas.find(f => f.dono) ?? fichas[0] ?? null
  const fsEdit = !!fs && (gm || fs.dono)
  const valDe = (nome: string) => fs?.attrs.find(a => a.n.toLowerCase() === nome.toLowerCase())?.v ?? null
  const modDe = (k: string) => { const n = AB.find(a => a[1] === k)?.[0]; const v = n ? valDe(n) : null; return v === null ? 0 : attributeModifier(v, d.categoria) }
  const sheetAttrs = fs ? (d20
    ? AB.map(([n]) => fs.attrs.find(a => a.n === n)).filter((a): a is NonNullable<typeof a> => !!a)
    : fs.attrs.filter(a => a.n !== 'Classe de Armadura')).slice(0, 9) : []
  const rolarComo = (what: string, mod: number, o: { n?: number; d?: number } = {}) =>
    rolar({ n: o.n ?? 1, d: o.d ?? 20, mod, adv: o.d ? 'normal' : dice.adv, who: fs ? primeiro(fs.n) : euNome, what })
  const mudarHpFicha = (dd: number) => {
    if (!fs || !fsEdit) return
    const novo = Math.max(0, Math.min(fs.max, fs.hp + dd))
    if (fs.tokenId) mudarTokens(ts => ts.map(t => t.id === fs.tokenId ? { ...t, hp: novo, maxHp: t.maxHp ?? fs.max } : t))
    // A vida da ficha também (como a ficha lateral antiga).
    const url = fs.kind === 'player' ? `/api/characters/${fs.charId}` : `${api}/npcs/${fs.charId}`
    clearTimeout(hpT.current); hpT.current = setTimeout(() => { void json(url, 'PATCH', { hp: novo }) }, 500)
  }
  const hpT = useRef<ReturnType<typeof setTimeout>>()
  const notaAtual = fs ? (notas[fs.key] ?? fs.nota ?? '') : ''

  // ── Valores do template ──
  const selT = tokens.find(t => t.id === sel)
  const temHp = (t: Token) => d.temPv && typeof t.hp === 'number' && !!t.maxHp
  const pctOf = (t: Token) => temHp(t) ? Math.max(0, Math.min(100, Math.round(t.hp! / t.maxHp! * 100))) : 100
  // Visão do jogador: o jogador de verdade ou o mestre em "Visão do jogador".
  const olharJogador = pv || !gm
  const escondido = (t: Token) => olharJogador && t.type === 'enemy' && nevoa.some(f => f.on && cel(t.x) >= f.x && cel(t.x) < f.x + f.w && cel(t.y) >= f.y && cel(t.y) < f.y + f.h)
  const segundos = d.sessao && agora ? Math.max(0, Math.floor(((ended ?? (ativa ? agora : new Date(d.sessao.inicio).getTime())) - new Date(d.sessao.inicio).getTime()) / 1000)) : 0
  const timer = `${p2(Math.floor(segundos / 3600))}:${p2(Math.floor(segundos / 60) % 60)}:${p2(segundos % 60)}`
  const ms = measure
  const msD = ms ? (() => { const cells = Math.max(Math.abs(ms.x2 - ms.x1), Math.abs(ms.y2 - ms.y1)) / CELL; return { ...ms, mx: (ms.x1 + ms.x2) / 2, my: (ms.y1 + ms.y2) / 2, label: mapaAberto.escala === 0 ? `${cells} quadr. · ${(cells * 1.5).toFixed(1).replace('.', ',')} m · ${cells * 5} ft` : `${cells} quadr. · ${String(+(cells * (mapaAberto.escala === 1 ? 3 : 1.5)).toFixed(1)).replace('.', ',')} ${mapaAberto.escala === 1 ? 'm' : 'km'}` } })() : { x1: 0, y1: 0, x2: 0, y2: 0, mx: 0, my: 0, label: '' }
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
  const curVis: VisKey = gm ? rollVis.gm : rollVis.pl

  const encerrar = async () => {
    const r = await fetch(`${api}/sessions/end`, { method: 'POST' }).catch(() => null)
    if (!r?.ok) { setEndErro(true); return }
    setEndErro(false)
    setEnded(Date.now())
  }

  // ── Ao vivo (mestre libera jogadores; extras em token.allowedPlayers) ──
  const jogadores = d.membros.filter(m => m.role !== 'GM')
  const nLive = jogadores.filter(m => live.includes(m.id)).length
  const salvarLive = (next: string[]) => { setLive(next); if (ativa) void patch(d.campaignId, { liveMembersJson: JSON.stringify(next) }) }
  const nomeDe = (memberId: string) => { const m = d.membros.find(x => x.id === memberId); return m?.char ? m.char.n : m?.u ?? '' }
  const meuToken = tokens.find(t => t.id === d.meuId)
  const meuNomeTok = primeiro(meuToken?.label ?? nomeDe(d.meuId))
  const extrasMeus = tokens.filter(t => t.id !== d.meuId && t.allowedPlayers?.includes(d.meuId)).map(t => t.label.split(',')[0]!)
  const myLive = live.includes(d.meuId)

  // ── Chat: mensagens (expression "chat") e rolagens no mesmo fluxo ──
  const gmU = d.membros.find(m => m.role === 'GM')?.u
  const sendChat = async () => {
    const txt = chatIn.trim()
    if (!txt || !ativa || ended) return
    const m = txt.match(/^\/r\s+(\d*)d(\d+)\s*([+-]\s*\d+)?$/i)
    if (m) { setChatIn(''); void rolar({ n: +(m[1] || 1), d: +m[2]!, mod: +((m[3] || '0').replace(/\s/g, '')), adv: 'normal', what: 'Rolagem no chat' }); return }
    setChatIn('')
    const r = await json(`${api}/rolls`, 'POST', { expression: 'chat', message: txt })
    const e = r?.ok ? await r.json().catch(() => null) as RollLogEntry | null : null
    if (!e) { setChatIn(txt); avisar('Não foi possível enviar · tente de novo'); return }
    const entry = { ...e, rolledAt: new Date(e.rolledAt).toISOString() }
    setLog(prev => [entry, ...prev.filter(x => x.id !== entry.id)].slice(0, 80))
    setFresh(entry.id)
  }
  const nMsgs = log.filter(l => l.expression === 'chat').length

  // ── Handouts ──
  const hfOk = !!(hf.x.trim() || hf.u.trim())
  const compartilhar = async () => {
    if (!hfOk) return
    const r = await json(`${api}/handouts`, 'POST', { title: hf.t.trim() || undefined, content: hf.x.trim() || undefined, imageUrl: hf.u.trim() || undefined })
    if (!r?.ok) { const j = await r?.json().catch(() => null) as { error?: string } | null; avisar(j?.error ?? 'Não foi possível compartilhar · tente de novo'); return }
    const h = await r.json().catch(() => null) as HandoutApi | null
    setHf({ t: '', x: '', u: '' })
    if (h) { setHands(prev => [{ id: h.id, t: h.title, x: h.content, img: h.imageUrl, at: new Date(h.createdAt).toISOString(), por: eu.u, vistos: [] }, ...prev]); setFreshHand(h.id) }
  }
  const quando = (iso: string) => {
    if (!agora) return ''
    const dt = new Date(iso), hoje = new Date(agora)
    return dt.toDateString() === hoje.toDateString() ? hhmm(iso) : `${p2(dt.getDate())}/${p2(dt.getMonth() + 1)}`
  }

  // ── Notas da ficha (salvam sozinhas, como na ficha) ──
  const onNote = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (!fs || !fsEdit) return
    const v = e.target.value, f = fs
    setNotas(n => ({ ...n, [f.key]: v })); setNoteSt('saving')
    noteT.current.forEach(clearTimeout)
    noteT.current = [setTimeout(async () => {
      const r = await json(`/api/characters/${f.charId}/text-fields`, 'POST', { key: 'mesa_notes', label: 'Notas da Sessão', value: v, order: 99 })
      setNoteSt(r?.ok ? 'saved' : 'idle')
      if (!r?.ok) avisar('Não foi possível salvar a nota')
      noteT.current.push(setTimeout(() => setNoteSt('idle'), 1700))
    }, 700)]
  }
  const fsTabsList = ([['attr', 'Atributos'], ...(d20 ? [['skill', 'Perícias']] : []), ...(fs?.armas ? [['atk', 'Ataques']] : []), ...(fs?.nota !== null && fs ? [['notes', 'Notas']] : [])] as [string, string][])
  const fsTabOk = fsTabsList.some(([k]) => k === fsTab) ? fsTab : 'attr'

  // ── Mesa sem sessão ──
  // Jogador (e mestre em outra aba): a tela abre sozinha quando a sessão começa.
  useEffect(() => {
    if (ativa) return
    const iv = setInterval(async () => {
      const r = await fetch(`${api}/rolls`).catch(() => null)
      const j = r?.ok ? await r.json().catch(() => null) as { sessionState?: unknown } | null : null
      if (j?.sessionState) router.refresh()
    }, 10_000)
    return () => clearInterval(iv)
  }, [ativa, api, router])
  const iniciar = async () => {
    if (iniciando) return
    setIniciando(true)
    const r = await json(`${api}/sessions/start`, 'POST', {})
    setIniciando(false)
    // 409 = já existe sessão ativa (outra aba): recarregar resolve igual.
    if (r?.ok || r?.status === 409) { router.refresh(); return }
    avisar('Não foi possível iniciar a sessão · tente de novo')
  }

  // ── Tutorial da Mesa: destaca os elementos reais (data-tour) ──
  const TOUR: [string, string, string][] = [
    ['ferramentas', 'As ferramentas', `À esquerda ficam ${gm ? 'selecionar, mover o mapa, token, ping, régua e névoa. As letras V, H, T, P, R e F' : 'selecionar, mover o mapa, ping e régua. As letras V, H, P e R'} trocam de ferramenta.`],
    ['dados', 'A barra de dados', 'Escolha os dados, o modificador, vantagem e quem vê a rolagem. Espaço rola na hora.'],
    ['painel', 'O painel lateral', 'Iniciativa, fichas, chat, handouts e música. A ficha lateral tem tudo o que você precisa no meio do combate.'],
    ...(gm && !pv ? [['aovivo', 'Ao vivo', 'Libere quem pode mover o próprio token. Sem liberação, o jogador só olha.'] as [string, string, string]] : []),
  ]
  const tourKey = TOUR[tourStep]?.[0]
  useEffect(() => {
    if (!tourKey) { setTourRect(null); return }
    const medir = () => {
      const el = document.querySelector(`[data-tour="${tourKey}"]`)
      const r = el?.getBoundingClientRect()
      setTourRect(r ? { x: r.left - 4, y: r.top - 4, w: r.width + 8, h: r.height + 8 } : null)
    }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [tourKey])
  // Primeira visita à Mesa neste navegador: o tutorial abre sozinho.
  useEffect(() => {
    try { if (!localStorage.getItem('saga_tour_mesa')) { localStorage.setItem('saga_tour_mesa', '1'); setTourStep(0) } } catch { /* sem storage */ }
  }, [])
  const tourVals = (() => {
    const r = tourRect ?? { x: 0, y: 0, w: 0, h: 0 }
    const vw = typeof window === 'undefined' ? 1440 : window.innerWidth, vh = typeof window === 'undefined' ? 900 : window.innerHeight
    // Balão ao lado do destaque, dentro da tela (330 px de largura).
    const cx = r.x + r.w + 16 + 330 < vw ? r.x + r.w + 16 : Math.max(16, r.x - 346)
    const cy = Math.max(16, Math.min(vh - 220, r.y + (r.h > vh / 2 ? 60 : r.h + 16 > vh - 220 ? -230 : 0)))
    const t = TOUR[Math.max(0, tourStep)] ?? TOUR[0]!
    return { n: tourStep + 1, t: t[1], x2: t[2], x: `${r.x}px`, y: `${r.y}px`, w: `${r.w}px`, h: `${r.h}px`, cx: `${cx}px`, cy: `${cy}px` }
  })()

  return {
    // Mesa no celular (screens/mesacelular): rolar ataque de um token e dados do token.
    atacarToken: (id: string) => { const t = tokens.find(x => x.id === id); if (t) void rolar({ n: 1, d: 20, mod: dice.mod, adv: dice.adv, who: primeiro(t.label), what: 'Ataque' }) },
    podeVerVida: (t: Token) => temHp(t) && (gm || t.type !== 'enemy'),
    sessaoNome: d.sessao?.nome ?? null, campanhaId: d.campaignId,
    // Sem sessão ao vivo (painel de espera, preparo e "Iniciar sessão").
    mLiveOn: ativa, mIdle: !ativa && !(gm && prep), mGMIdle: gm && !ativa, mPrepOn: gm && !ativa && prep,
    mIdleBg: !gm ? 'rgb(12 8 5/.72)' : 'rgb(12 8 5/.55)', mIdleIcon: !gm ? Lock : Flame,
    mIdleTitle: !gm ? 'A mesa está fechada' : 'Nenhuma sessão ao vivo',
    mIdleLead: !gm ? `O Mestre ainda não começou a sessão. Esta tela abre sozinha quando a sessão começar.${d.proxima ? ` Próxima: ${d.proxima}.` : ''}` : 'Inicie a sessão para abrir a mesa para a companhia, ou prepare o mapa e os tokens antes, sem que ninguém veja.',
    mStart: () => { void iniciar() },
    mPrep: () => { setPrep(true); if (!d.sessao) avisar('Inicie a primeira sessão para guardar o mapa; até lá o preparo fica só nesta tela') },
    tourOn: tourStep >= 0 && !!tourRect, tourOpen: () => setTourStep(0), tourClose: () => setTourStep(-1), tourTalk: tourStep >= 0,
    tourNext: () => setTourStep(s => s >= TOUR.length - 1 ? -1 : s + 1), tourNextL: tourStep >= TOUR.length - 1 ? 'Começar' : 'Próximo',
    tour: tourVals, tourDots: TOUR.map((_, i) => i === tourStep ? '#e8c46a' : 'rgb(232 196 106/.3)'),
    $href: (link: string) => dcHref(link, ctx),
    $img: (id: string) => id === 'mesa-musica-capa' ? ((musica ?? ultima) ? `https://i.ytimg.com/vi/${musica ?? ultima}/hqdefault.jpg` : null) : null,
    voltarHref: `/campaign/${d.campaignId}`,
    campanha: d.campanha, sceneName: nomeSessao,
    toggleTema, timer,
    // Abas de mapa no topo (• = o que os jogadores veem). Jogador: só o da mesa.
    scenes: mapas.map(m => {
      const on = m.id === aberto
      return { n: `${gm && m.id === naMesa ? '• ' : ''}${m.nome}`, thumb: miniatura(m), go: () => { if (!on) void abrirMapa(m.id) }, bg: on ? 'var(--accent-t)' : 'transparent', ring: on ? 'var(--accent)' : 'var(--line)', color: on ? 'var(--accent)' : 'var(--ink)' }
    }),
    mapsToggle: () => setMapsOpen(o => !o), mapsOpen, mapsPanel: mapsOpen && gm && !pv, mapasProps, nMaps: mapas.length,
    mapsC: mapsOpen ? 'var(--accent)' : 'var(--ink)', mapsRing: mapsOpen ? 'var(--accent)' : 'var(--line)', mapsBg: mapsOpen ? 'var(--accent-t)' : 'transparent',
    fitNow: ajustar,
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
        if (url !== mapa) gravarImagem(url)
        setMapDraft('')
      } else setMapDraft(mapa ?? '')
      setMapEdit(!mapEdit); setSel(null)
    },
    meLabel: mapEdit ? 'Concluir mapa' : 'Trocar mapa', meBg: mapEdit ? 'var(--gold-t)' : 'transparent',
    mapEdit, mapDraft, onMapDraft: (e: ChangeEvent<HTMLInputElement>) => setMapDraft(e.target.value),
    tirarMapa: () => { setMapDraft(''); gravarImagem(null) },
    tools: toolsOk.map(k => ({ l: TOOLS[k][0], icon: TOOLS[k][1], k: TOOLS[k][2], go: () => { setTool(k); setMeasure(null) }, bg: tool === k ? 'var(--accent)' : 'transparent', color: tool === k ? '#fff8f0' : 'var(--muted)', hover: tool === k ? 'var(--accent)' : 'var(--surface2)' })),
    toolIcon: mapEdit ? ImageUp : TOOLS[tool][1],
    toolHint: aviso ?? (outro && !mapEdit ? `Preparando “${mapaAberto.nome}” · os jogadores veem “${mapas.find(m => m.id === naMesa)?.nome ?? 'o mapa da mesa'}”` : mapEdit ? 'Cole o link, cole a imagem ou solte o arquivo no mapa · depois, Concluir mapa' : !ativa ? 'Nenhuma sessão ao vivo · o Mestre inicia pelo Painel' : tool === 'token' && pend ? `Clique no mapa para posicionar ${pend.label}` : TOOLS[tool][3]),
    zoom, zoomLabel: `${Math.round(zoom * 100)}%`,
    zoomIn: () => setZoom(z => Math.min(1.8, +(z + .1).toFixed(2))), zoomOut: () => setZoom(z => Math.max(vpZoomMin, +(z - .1).toFixed(2))),
    onWheel: (e: WheelEvent) => setZoom(z => Math.max(vpZoomMin, Math.min(1.8, +(z + (e.deltaY < 0 ? .08 : -.08)).toFixed(2)))),
    panX: pan.x, panY: pan.y, boardTr: panning ? 'none' : 'transform .2s ease-out',
    vpCursor: tool === 'pan' ? (panning ? 'grabbing' : 'grab') : tool === 'select' ? 'default' : 'crosshair',
    vpRef, boardRef, vpDown, stop: (e: { stopPropagation: () => void }) => e.stopPropagation(),
    boardW: W, boardH: H, terrain: TERRENO, mapa: safeImageUrl(mapa), onMapLoad: (e: { currentTarget: HTMLImageElement }) => setMapSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight }),
    slotZ: mapEdit ? 60 : 1, slotOutline: mapEdit ? '3px dashed #f0d060' : 'none',
    fog: [...nevoa.map(f => ({
      x: f.x * CELL, y: f.y * CELL, w: f.w * CELL, h: f.h * CELL, label: f.on ? f.label : `${f.label} · revelada`, op: f.on ? 1 : (tool === 'fog' ? .35 : 0),
      bg: f.on ? (olharJogador ? '#120c08' : 'rgb(18 12 8/.62)') : 'rgb(18 12 8/.15)', blur: f.on ? 'blur(2px)' : 'none', pe: (tool === 'fog' ? 'auto' : 'none') as 'auto' | 'none',
      outline: tool === 'fog' ? '2px dashed rgb(240 208 96/.7)' : 'none', lblOp: gm && (tool === 'fog' || !pv) ? 1 : 0,
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
      caTxt: selT?.ca != null ? ` · CA ${selT.ca}` : '',
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
    temVisibilidade: gm || !regraPl,
    visOpts: ((gm ? ['pub', 'secret'] : regraPl ? [regraPl] : ['pub', 'self', 'gm', 'blind']) as VisKey[]).map(k => {
      const on = curVis === k
      return {
        l: VIS[k][0], t: `${VIS[k][0]} · ${VIS[k][2]}`, icon: VIS[k][1], on, lblD: on ? 'inline' : 'none',
        go: () => setRollVis(v => gm ? { ...v, gm: k } : { ...v, pl: k }),
        bg: on ? (k === 'pub' ? 'var(--surface)' : '#2a1a10') : 'transparent', color: on ? (k === 'pub' ? 'var(--ink)' : '#e8c46a') : 'var(--muted)', sh: on ? '0 1px 2px rgb(0 0 0/.15)' : 'none',
      }
    }),
    rollBtnLabel: `Rolar ${dice.n}d${dice.d}${dice.mod ? sg(dice.mod) : ''}${curVis === 'pub' ? '' : ` · ${VIS[curVis][0].toLowerCase()}`}`,
    rollBtnBg: curVis === 'pub' ? 'linear-gradient(180deg,#a8262f,#7a1820)' : 'linear-gradient(180deg,#4a2e1c,#24150c)',
    rollNow: () => { void rolar({ ...dice, what: 'Rolagem livre' }) },
    showRoll: !!rl,
    roll: rl ? {
      ...rl, hasVis: !!rl.vis && rl.vis !== 'pub', visL: rl.vis && rl.vis !== 'pub' ? `${VIS[rl.vis][0]} · ${VIS[rl.vis][2]}` : '', visIcon: VIS[rl.vis ?? 'pub'][1],
      openDone: rl.done && !rl.sealed, sealedDone: rl.done && !!rl.sealed,
      anim: !rl.done ? 'mesa-diceSpin 1s cubic-bezier(.2,.7,.3,1) both' : rl.crit && !rl.sealed ? 'mesa-critShake .45s 2' : 'none',
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
    // Ficha lateral completa.
    fsChips: fichas.filter(f => gm && !pv ? true : f.kind === 'player').map(f => ({
      label: primeiro(f.n), full: f.n, i: (f.n[0] ?? '?').toUpperCase(), c: f.c, bg: fs?.key === f.key ? 'var(--accent-t)' : 'var(--surface)', ring: fs?.key === f.key ? 'var(--accent)' : 'var(--line)',
      go: () => { setSheet(f.key); if (f.tokenId) setSel(f.tokenId) },
    })),
    temFicha: !!fs,
    fs: fs ? (() => {
      const p = fs.max > 0 ? Math.max(0, Math.min(100, Math.round(fs.hp / fs.max * 100))) : 100, desM = modDe('DES')
      const tok = fs.tokenId ? tokens.find(t => t.id === fs.tokenId) : undefined
      return {
        n: fs.n, i: (fs.n[0] ?? '?').toUpperCase(), c: fs.c, sub: fs.sub, hp: fs.hp, max: fs.max, pct: p, hpC: hpC(p), ca: fs.ca ?? tok?.ca ?? '—', iniMod: d20 ? sg(desM) : '+0', canEdit: fsEdit && d.temPv,
        rollIni: async () => {
          const e = await rolarComo('Iniciativa', d20 ? desM : 0)
          // Só o mestre grava a iniciativa no token: de jogadores o servidor só aceita a posição.
          if (e && fs.tokenId && gm) mudarTokens(ts => ts.map(t => t.id === fs.tokenId ? { ...t, ini: e.total } : t))
        },
        hasCond: (tok?.cond?.length ?? 0) > 0, cond: tok?.cond ?? [],
        hpBtns: ([[-5, '−5'], [-1, '−1'], [1, '+1'], [5, '+5']] as const).map(([dd, l]) => ({ l, go: () => mudarHpFicha(dd), bg: dd < 0 ? 'color-mix(in oklab, var(--blood) 12%, transparent)' : 'color-mix(in oklab, var(--ok) 14%, transparent)', color: dd < 0 ? 'var(--blood)' : 'var(--ok)' })),
        temSaves: d20,
        saves: d20 ? AB.map(([n, k]) => { const m = modDe(k), sv = valDe(`Salv. ${n}`), b = sv ?? m; return { k, b: sg(b), dot: sv !== null && sv > m ? 'var(--accent)' : 'transparent', go: () => { void rolarComo(`Salvaguarda de ${k}`, b) } } }) : [],
        skills: d20 ? SK.map(([n, k]) => { const m = modDe(k), v = valDe(n), b = v ?? m; return { n, a: k, b: sg(b), dot: v !== null && v > m ? 'var(--accent)' : 'transparent', go: () => { void rolarComo(n, b) } } }) : [],
        attacks: (fs.armas ?? []).map(w => ({
          n: w.n, b: sg(w.b), d: w.d || '—',
          atk: () => { void rolarComo(`Ataque · ${w.n}`, w.b) },
          dmg: () => { const x = w.d.match(/(\d+)d(\d+)\s*([+-]\s*\d+)?/); if (!x) return; void rolarComo(`Dano · ${w.n}`, +((x[3] ?? '0').replace(/\s/g, '')), { n: +x[1]!, d: +x[2]! }) },
        })),
        note: notaAtual, ro: !fsEdit, onNote,
        saveTxt: !fsEdit ? 'só leitura' : noteSt === 'saving' ? 'Salvando…' : noteSt === 'saved' ? 'Salvo' : 'salva sozinha', saveC: noteSt === 'saved' ? 'var(--ok)' : 'var(--muted)',
        href: fs.kind === 'player' ? `/personagens/${fs.charId}` : `/campaign/${d.campaignId}/npcs?npc=${fs.charId}`,
      }
    })() : { n: '', i: '', c: '', sub: '', hp: 0, max: 0, pct: 0, hpC: '', ca: '—' as string | number, iniMod: '', canEdit: false, rollIni: vazio, hasCond: false, cond: [] as string[], hpBtns: [] as { l: string; go: () => void; bg: string; color: string }[], temSaves: false, saves: [] as { k: string; b: string; dot: string; go: () => void }[], skills: [] as { n: string; a: string; b: string; dot: string; go: () => void }[], attacks: [] as { n: string; b: string; d: string; atk: () => void; dmg: () => void }[], note: '', ro: true, onNote, saveTxt: '', saveC: '', href: '#' },
    fsTabs: fsTabsList.map(([k, l]) => ({ l, on: fsTabOk === k, go: () => setFsTab(k), bg: fsTabOk === k ? 'var(--surface)' : 'transparent', color: fsTabOk === k ? 'var(--ink)' : 'var(--muted)', sh: fsTabOk === k ? '0 1px 2px rgb(0 0 0/.12)' : 'none' })),
    fsAttr: fsTabOk === 'attr', fsSkill: fsTabOk === 'skill', fsAtk: fsTabOk === 'atk', fsNotes: fsTabOk === 'notes',
    sheet: {
      attrs: sheetAttrs.map(a => {
        const pool = attributePool(a.v, a.die), m = attributeModifier(a.v, d.categoria)
        return {
          k: d20 ? (AB.find(x => x[0] === a.n)?.[1] ?? a.n.slice(0, 3).toUpperCase()) : a.n.slice(0, 10).toUpperCase(), v: a.v, m: d20 ? sg(m) : `${pool.count}${pool.die}`,
          go: () => { void (d20 ? rolarComo(a.n, m) : rolarComo(a.n, 0, { n: pool.count, d: Number(pool.die.slice(1)) })) },
        }
      }),
    },
    nRolls,
    // Chat: rolagens e mensagens no mesmo fluxo.
    chatCount: `${nMsgs} mensage${nMsgs === 1 ? 'm' : 'ns'} · ${log.length - nMsgs} rolage${log.length - nMsgs === 1 ? 'm' : 'ns'}`,
    chatIn, onChatIn: (e: ChangeEvent<HTMLInputElement>) => setChatIn(e.target.value),
    chatKey: (e: { key: string }) => { if (e.key === 'Enter') void sendChat() }, chatSend: () => { void sendChat() },
    chatOff: !ativa || ended !== null, chatPh: ended !== null ? 'Sessão encerrada' : !ativa ? 'Nenhuma sessão ao vivo' : 'Mensagem para a mesa…', chatOp: chatIn.trim() ? 1 : .5,
    log: log.map(l => {
      const q = quem.get(l.rolledBy), anim = l.id === fresh ? 'mesa-logIn .5s both' : 'none'
      if (l.expression === 'chat') {
        const isGm = l.rolledBy === gmU, who = q?.n ?? l.rolledBy
        return {
          isMsg: true, isRoll: false, id: l.id, who, i: (who[0] ?? '?').toUpperCase(), c: q?.c ?? GM_COR, text: l.attribute ?? '', gm: isGm, t: agora ? hhmm(l.rolledAt) : '', anim,
          font: isGm ? "italic 400 15px/1.4 'IM Fell English',serif" : "400 13px/1.45 'Geist',sans-serif",
          whatS: '', detailS: '', total: 0, color: '', hasVis: false, visL: '', visIcon: Eye, visBg: '', visC: '', showTotal: false, sealed: false, avOp: 1, rowBg: 'transparent', canReveal: false, reveal: vazio,
        }
      }
      const [a, ...b] = (l.attribute ?? '').split(' · ')
      // Rolagens privadas: o modo vem do servidor (full / sealed = a própria às cegas / ghost = de outro, sem resultado).
      const mode = l.mode ?? 'full', vk = VIS_DE[l.visibility ?? 'PUBLIC'] ?? 'pub', V = VIS[vk]
      const crit = mode === 'full' && /^1?d20/i.test(l.expression) && l.rolls[0] === 20
      const who = b.length ? a! : (q?.n ?? l.rolledBy), what = b.length ? b.join(' · ') : (l.attribute || l.expression)
      const hora = agora ? hhmm(l.rolledAt) : ''
      return {
        isMsg: false, isRoll: true, id: l.id, who, i: (who[0] ?? '?').toUpperCase(), c: q?.c ?? GM_COR, text: '', gm: false, t: '', font: '', anim,
        whatS: mode === 'ghost' ? (l.porMestre ? 'rolou em segredo' : 'rolou para o Mestre') : what,
        detailS: mode === 'full' ? `${detalhe(l)}${hora ? ` · ${hora}` : ''}` : mode === 'sealed' ? `resultado com o Mestre${hora ? ` · ${hora}` : ''}` : hora,
        total: l.total, color: crit ? 'var(--accent)' : 'var(--ink)',
        hasVis: vk !== 'pub' || !!l.revealed, visL: l.revealed ? 'Revelada' : V[0], visIcon: l.revealed ? Eye : V[1],
        visBg: l.revealed ? 'color-mix(in oklab, var(--ok) 14%, transparent)' : 'var(--gold-t)', visC: l.revealed ? 'var(--ok)' : 'color-mix(in oklab, var(--gold) 65%, var(--ink))',
        showTotal: mode === 'full', sealed: mode !== 'full', avOp: mode === 'ghost' ? .55 : 1,
        rowBg: mode === 'full' && vk !== 'pub' && gm ? 'color-mix(in oklab, var(--gold-t) 45%, transparent)' : 'transparent',
        canReveal: gm && vk !== 'pub' && vk !== 'self',
        reveal: async () => {
          const r = await json(`${api}/rolls/${l.id}`, 'PATCH', { revelar: true })
          const e = r?.ok ? await r.json().catch(() => null) as RollLogEntry | null : null
          if (!e) { avisar('Não foi possível revelar · tente de novo'); return }
          setLog(prev => prev.map(x => x.id === l.id ? { ...e, rolledAt: new Date(e.rolledAt).toISOString() } : x)); setFresh(l.id)
        },
      }
    }),
    // Handouts.
    hf: { ...hf, onT: (e: ChangeEvent<HTMLInputElement>) => setHf(h => ({ ...h, t: e.target.value })), onX: (e: ChangeEvent<HTMLTextAreaElement>) => setHf(h => ({ ...h, x: e.target.value })), onU: (e: ChangeEvent<HTMLInputElement>) => setHf(h => ({ ...h, u: e.target.value })), op: hfOk ? 1 : .45, go: () => { void compartilhar() } },
    handLine: gm ? `${hands.length} compartilhado(s)` : `${hands.filter(h => !h.vistos.includes(d.meuId)).length} novo(s)`,
    noHands: hands.length === 0,
    hands: hands.map(h => {
      const open = openHand === h.id, isNew = !gm && !h.vistos.includes(d.meuId), nSeen = jogadores.filter(j => h.vistos.includes(j.id)).length, img = safeImageUrl(h.img)
      return {
        id: h.id, t: h.t || 'Handout sem título', x: h.x ?? '', isNew, gm, imgH: open ? '170px' : '92px', clamp: open ? 20 : 2,
        art: img ? `url("${img.replace(/["\\]/g, '')}") center/cover, #2a1c10` : ART_CARTA,
        ring: isNew ? 'var(--accent)' : 'var(--line)', sh: isNew ? '0 0 0 3px var(--accent-t)' : 'none', anim: h.id === freshHand ? 'mesa-popIn .35s both' : 'none',
        meta: `${h.por} · ${quando(h.at)}`, seenTxt: jogadores.length && nSeen === jogadores.length ? 'todos viram' : `visto por ${nSeen}/${jogadores.length}`,
        seen: jogadores.map(j => ({ n: nomeDe(j.id), i: (nomeDe(j.id)[0] ?? '?').toUpperCase(), c: quem.get(j.u)?.c ?? GM_COR, op: h.vistos.includes(j.id) ? 1 : .3 })),
        open: () => {
          setOpenHand(open ? null : h.id)
          if (isNew) { setHands(xs => xs.map(x => x.id === h.id ? { ...x, vistos: [...x.vistos, d.meuId] } : x)); void json(`${api}/handouts/${h.id}`, 'PATCH') }
        },
        del: async () => {
          const r = await json(`${api}/handouts/${h.id}`, 'DELETE')
          if (r?.ok) setHands(xs => xs.filter(x => x.id !== h.id)); else avisar('Não foi possível apagar o handout')
        },
      }
    }),
    // Ao vivo.
    isGMView: gm && !pv, pv: !gm,
    liveOpen, liveToggle: () => setLiveOpen(o => !o), liveCount: `${nLive}/${jogadores.length}`,
    liveIcon: nLive ? Wifi : WifiOff, liveRing: nLive ? 'color-mix(in oklab, var(--ok) 45%, var(--line))' : 'var(--line)', liveBg: nLive ? 'color-mix(in oklab, var(--ok) 12%, var(--surface))' : 'var(--surface)', liveColor: nLive ? 'var(--ok)' : 'var(--ink)',
    anyLive: nLive > 0, liveOffAll: () => { setLiveExp(null); salvarLive([]) },
    liveRows: jogadores.map(m => {
      const tk = tokens.find(t => t.id === m.id), nome = tk?.label ?? nomeDe(m.id), on = live.includes(m.id), open = on && liveExp === m.id, first = primeiro(nome)
      const extras = tokens.filter(t => t.id !== m.id).map(t => ({
        n: t.label, c: t.color, on: !!t.allowedPlayers?.includes(m.id),
        go: () => mudarTokens(ts => ts.map(x => x.id === t.id ? { ...x, allowedPlayers: x.allowedPlayers?.includes(m.id) ? x.allowedPlayers.filter(y => y !== m.id) : [...(x.allowedPlayers ?? []), m.id] } : x), true),
      }))
      return {
        n: nome, i: (nome[0] ?? '?').toUpperCase(), c: tk?.color ?? quem.get(m.u)?.c ?? GM_COR, u: m.u, on, open, first, extras, nExtra: extras.filter(x => x.on).length || '',
        icon: on ? Wifi : WifiOff, ic: on ? 'var(--ok)' : 'var(--muted)',
        ring: on ? 'color-mix(in oklab, var(--ok) 35%, var(--line))' : 'var(--line)', bg: on ? 'color-mix(in oklab, var(--ok) 8%, transparent)' : 'transparent', tokC: open ? 'var(--ok)' : 'var(--muted)', tokRing: open ? 'var(--ok)' : 'var(--line)',
        exp: () => setLiveExp(x => x === m.id ? null : m.id),
        sw: { on, l: `Liberar ${first} ao vivo`, go: () => { salvarLive(on ? live.filter(x => x !== m.id) : [...live, m.id]); if (on && liveExp === m.id) setLiveExp(null) }, track: on ? 'var(--ok)' : 'var(--line)', knob: on ? '21px' : '3px' },
      }
    }),
    lockText: myLive ? (extrasMeus.length ? `Você move ${meuNomeTok} e ${extrasMeus.join(', ')}` : `Você pode mover ${meuNomeTok}`) : 'Aguardando o Mestre liberar seus movimentos',
    lockIcon: myLive ? Move : Lock, lockBg: myLive ? 'rgb(40 70 30/.85)' : 'rgb(20 12 6/.8)', lockC: myLive ? '#d8f0c0' : '#e6d5ac', lockAnim: lockTick ? `${lockTick % 2 ? 'mesa-shakeA' : 'mesa-shakeB'} .45s both` : 'none',
    // Adicionar token.
    addOpen: tool === 'token' && gm && !pv, addClose: () => { setTool('select'); setPend(null) },
    addTabs: ([['npc', 'NPCs salvos'], ['free', 'Token avulso']] as const).map(([k, l]) => ({ l, go: () => setAddTab(k), bg: addTab === k ? 'var(--surface)' : 'transparent', color: addTab === k ? 'var(--ink)' : 'var(--muted)', sh: addTab === k ? '0 1px 2px rgb(0 0 0/.12)' : 'none' })),
    addNpc: addTab === 'npc', addFree: addTab === 'free', semNpcs: d.npcs.length === 0,
    npcPick: d.npcs.map(x => {
      const T2 = NT[x.type] ?? NT.NEUTRAL!, on = pend?.npc === x.id
      return {
        n: x.n, i: (x.n[0] ?? '?').toUpperCase(), c: T2[1], type: T2[0], tc: T2[1], hp: x.max, onMap: tokens.some(t => t.npc === x.id), cta: on ? 'clique no mapa' : 'Posicionar',
        bg: on ? 'var(--accent-t)' : 'transparent', ring: on ? 'var(--accent)' : 'transparent',
        go: () => setPend(on ? null : { npc: x.id, label: x.n, i: (x.n[0] ?? '?').toUpperCase(), type: T2[2], c: T2[1], hp: x.hp, max: x.max, ca: x.ca, img: x.img }),
      }
    }),
    freeName, onFreeName: (e: ChangeEvent<HTMLInputElement>) => setFreeName(e.target.value),
    freeTypes: (Object.entries(FT) as [Token['type'], [string, string]][]).map(([k, [l, dot]]) => ({ l, dot, go: () => setFreeType(k), bg: freeType === k ? 'var(--ink)' : 'var(--surface)', color: freeType === k ? 'var(--bg)' : 'var(--ink)', ring: freeType === k ? 'var(--ink)' : 'var(--line)' })),
    freeCta: pend && !pend.npc ? 'Clique no mapa para posicionar' : 'Posicionar no mapa',
    freeGo: () => {
      const n = tokens.filter(t => t.label.startsWith('Inimigo')).length + 1
      const nm = freeName.trim() || (freeType === 'enemy' ? `Inimigo ${n}` : 'Token')
      setPend({ label: nm, i: (nm[0] ?? '?').toUpperCase(), type: freeType, c: FT[freeType][1] }); setFreeName('')
    },
    tabHand: tab === 'hand',    togglePlay: () => {
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
