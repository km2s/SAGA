'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { StartSessionModal } from '@/components/gm/StartSessionModal'
import { EndSessionButton } from '@/components/gm/EndSessionButton'
import { MusicPlayer } from './MusicPlayer'
import { CharacterSheetPanel } from './CharacterSheetPanel'
import { HandoutsPanel } from './HandoutsPanel'
import {
  MousePointer, Hand, Coins, MapPin, Ruler, Cloud, Eye,
  ClipboardList, Music, Map, Play, X, Dice6, Sparkles, Skull,
  MessageSquare, Image as ImageIcon, Minus, Plus, Swords, ChevronRight, BookOpen, HelpCircle,
  Radio, Wifi, WifiOff, Send,
} from 'lucide-react'
import { safeImageUrl } from '@/lib/safe-url'
import { MesaSpotlight } from '@/components/tutorial/MesaSpotlight'
import { MarkTutorialVisited } from '@/components/tutorial/MarkTutorialVisited'

type Tool = 'select' | 'move' | 'token' | 'marker' | 'measure' | 'fog' | 'reveal'

interface Token {
  id: string; label: string; initial: string
  x: number; y: number
  type: 'player' | 'enemy' | 'npc'; color: string
  hp?: number; maxHp?: number
  imageUrl?: string | null
  allowedPlayers?: string[]
}

interface InitiativeEntry {
  tokenId: string; label: string; color: string; type: string
  initiative: number; hp?: number; maxHp?: number
}
interface Marker { id: string; x: number; y: number; color: string; createdAt: number }
interface RollLogEntry {
  id: string; expression: string; rolls: number[]; modifier: number
  total: number; attribute: string | null; rolledBy: string; rolledAt: string
}
interface CharAttr { id: string; value: number; name: string; defaultDie: string }
interface CharData {
  id: string; name: string; race: string | null; class: string | null
  level: number; hp: number; maxHp: number; imageUrl: string | null; attributes: CharAttr[]
}
interface Member { id: string; role: string; user: { username: string }; character: CharData | null }
interface NpcData { id: string; name: string; type: string; race: string | null; class: string | null; level: number; hp: number; maxHp: number; imageUrl: string | null; attributes: CharAttr[] }
interface Campaign { id: string; name: string }
interface SessionState { tokensJson: string | null; musicYoutubeId: string | null; musicVolume: number; mapImageUrl: string | null; liveMembersJson: string | null; markersJson?: string | null }
interface ActiveSession { id: string; name: string | null; isActive: boolean; tokensJson?: string | null; musicYoutubeId?: string | null; musicVolume?: number; mapImageUrl?: string | null; liveMembersJson?: string | null }
interface VirtualTableProps {
  campaign: Campaign; activeSession: ActiveSession | null
  members: Member[]; npcs: NpcData[]; initialRolls: RollLogEntry[]
  isGM: boolean; currentMemberId: string; systemName: string | null
}

const GRID = 40
const PLAYER_COLORS = ['#7c3aed','#2563eb','#0891b2','#059669','#d97706','#db2777','#9333ea']
const TOKEN_COLORS  = ['#7c3aed','#ef4444','#22c55e','#f59e0b','#06b6d4','#ec4899','#c9a22a']
const DICE = ['d4','d6','d8','d10','d12','d20','d100']

function snap(v: number) { return Math.round(v / GRID) * GRID }

function initTokens(members: Member[]): Token[] {
  return members
    .filter(m => m.role !== 'GM')
    .map((m, i) => ({
      id: m.id,
      label: m.character?.name ?? m.user.username,
      initial: (m.character?.name ?? m.user.username)[0]?.toUpperCase() ?? '?',
      x: ((i % 8) + 1) * GRID, y: (Math.floor(i / 8) + 1) * GRID,
      type: 'player' as const,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length] ?? '#7c3aed',
      hp: m.character?.hp,
      maxHp: m.character?.maxHp,
      imageUrl: m.character?.imageUrl ?? null,
    }))
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'agora'
  const m = Math.floor(s / 60)
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h`
}

interface TokenDrag { tokenId: string; startMouseX: number; startMouseY: number; startTokenX: number; startTokenY: number }
interface PanDrag   { startMouseX: number; startMouseY: number; startPanX: number; startPanY: number }
interface AddTokenState { screenX: number; screenY: number; worldX: number; worldY: number }
interface PinchState { dist: number; zoom: number; panX: number; panY: number; midX: number; midY: number }

export function VirtualTable({ campaign, activeSession, members, npcs, initialRolls, isGM, currentMemberId, systemName }: VirtualTableProps) {
  const [tool, setTool] = useState<Tool>('select')
  const [tokens, setTokens] = useState<Token[]>(() => {
    if (activeSession?.tokensJson) {
      try { return JSON.parse(activeSession.tokensJson) as Token[] } catch {}
    }
    return initTokens(members)
  })
  const tokensRef = useRef(tokens)
  tokensRef.current = tokens
  const [markers, setMarkers] = useState<Marker[]>([])
  const [rolls, setRolls] = useState<RollLogEntry[]>(initialRolls)
  const [sessionMusic, setSessionMusic] = useState<{ youtubeId: string | null; volume: number }>({
    youtubeId: activeSession?.musicYoutubeId ?? null,
    volume: activeSession?.musicVolume ?? 50,
  })
  const [pan, setPan] = useState({ x: 80, y: 60 })
  const [zoom, setZoom] = useState(1)
  const [tokenDrag, setTokenDrag] = useState<TokenDrag | null>(null)
  const [panDrag, setPanDrag] = useState<PanDrag | null>(null)
  const [addToken, setAddToken] = useState<AddTokenState | null>(null)
  const [newTokenLabel, setNewTokenLabel] = useState('')
  const [newTokenColor, setNewTokenColor] = useState(TOKEN_COLORS[0]!)
  const [newTokenType, setNewTokenType] = useState<'player' | 'enemy' | 'npc'>('player')
  const [rollingDie, setRollingDie] = useState<string | null>(null)
  const [lastRollId, setLastRollId] = useState<string | null>(null)
  const [rollModifier, setRollModifier] = useState(0)
  const [chatInput, setChatInput] = useState('')
  const [sendingChat, setSendingChat] = useState(false)
  const [measureAnchor, setMeasureAnchor] = useState<{x:number;y:number}|null>(null)
  const [pointerWorld, setPointerWorld] = useState<{x:number;y:number}>({x:0,y:0})
  const [fogRects, setFogRects] = useState<{id:string;x:number;y:number;w:number;h:number}[]>([])
  const [fogDraw, setFogDraw] = useState<{startX:number;startY:number;endX:number;endY:number}|null>(null)
  const [mapUrl, setMapUrl] = useState<string|null>(activeSession?.mapImageUrl ?? null)
  const [mapInputOpen, setMapInputOpen] = useState(false)
  const [mapInputValue, setMapInputValue] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const [startSessionOpen, setStartSessionOpen] = useState(false)
  const [musicOpen, setMusicOpen] = useState(false)
  const [sheetsOpen, setSheetsOpen] = useState(false)
  const [hpOverrides, setHpOverrides] = useState<Record<string, number>>({})
  const [initiativeOpen, setInitiativeOpen] = useState(false)
  const [initiativeOrder, setInitiativeOrder] = useState<InitiativeEntry[]>([])
  const [currentTurnIdx, setCurrentTurnIdx] = useState(0)
  const [handoutsOpen, setHandoutsOpen] = useState(false)
  const [gmCustomOpen, setGmCustomOpen] = useState(false)
  const [liveOpen, setLiveOpen] = useState(false)
  const [expandedLiveMember, setExpandedLiveMember] = useState<string | null>(null)
  const [liveMembers, setLiveMembers] = useState<string[]>(() => {
    const raw = activeSession?.liveMembersJson
    if (!raw) return []
    try { return JSON.parse(raw) as string[] } catch { return [] }
  })

  const canvasRef       = useRef<HTMLDivElement>(null)
  const chatEndRef      = useRef<HTMLDivElement>(null)
  const pinchRef        = useRef<PinchState | null>(null)
  const sinceRef        = useRef(initialRolls[0]?.rolledAt ?? new Date(0).toISOString())
  const tokenDragRef    = useRef<TokenDrag | null>(null)
  const liveMembersRef  = useRef<string[]>(liveMembers)
  const mapDropRef      = useRef<HTMLDivElement>(null)

  // ── Effects ──
  useEffect(() => { tokenDragRef.current = tokenDrag }, [tokenDrag])
  useEffect(() => { liveMembersRef.current = liveMembers }, [liveMembers])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [rolls])
  useEffect(() => {
    const t = setInterval(() => { const c = Date.now()-10000; setMarkers(p=>p.filter(m=>m.createdAt>c)) }, 500)
    return () => clearInterval(t)
  }, [])
  // Close map dropdown on click outside (no backdrop overlay needed)
  useEffect(() => {
    if (!mapInputOpen) return
    function onDown(e: MouseEvent) {
      if (mapDropRef.current && !mapDropRef.current.contains(e.target as Node)) {
        setMapInputOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [mapInputOpen])
  const syncTokens = useCallback((next: Token[]) => {
    if (!activeSession) return
    // Non-GM players only sync if the GM granted them live permission
    if (!isGM && !liveMembersRef.current.includes(currentMemberId)) return
    fetch(`/api/campaigns/${campaign.id}/sessions/state`, {
      method: 'PATCH',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ tokensJson: JSON.stringify(next) }),
    }).catch(() => {})
  }, [activeSession, campaign.id, isGM, currentMemberId])

  useEffect(() => {
    if (!activeSession?.isActive) return
    const iv = setInterval(async () => {
      const res = await fetch(`/api/campaigns/${campaign.id}/rolls?since=${encodeURIComponent(sinceRef.current)}`).catch(()=>null)
      if (!res?.ok) return
      const data: { rolls: RollLogEntry[]; sessionState: SessionState | null } = await res.json().catch(() => ({ rolls: [], sessionState: null }))
      const fresh = data.rolls ?? []
      const st = data.sessionState
      if (fresh.length) {
        sinceRef.current = fresh[0]!.rolledAt
        setRolls(prev => {
          const ids = new Set(prev.map(r=>r.id))
          const news = fresh.filter(r=>!ids.has(r.id))
          return news.length ? [...news.reverse(), ...prev].slice(0, 50) : prev
        })
      }
      // All clients (including GM) update from server when not actively dragging
      if (st && !tokenDragRef.current) {
        if (st.tokensJson !== null) {
          try { setTokens(JSON.parse(st.tokensJson)) } catch {}
        }
        setMapUrl(st.mapImageUrl)
        setSessionMusic({ youtubeId: st.musicYoutubeId, volume: st.musicVolume })
      }
      // Always sync live members list
      if (st?.liveMembersJson !== undefined) {
        try {
          const live = st.liveMembersJson ? JSON.parse(st.liveMembersJson) as string[] : []
          setLiveMembers(live)
        } catch {}
      }
      // Merge server markers (pings from other clients)
      if (st?.markersJson) {
        try {
          const serverMarkers = JSON.parse(st.markersJson) as Marker[]
          const now = Date.now()
          setMarkers(prev => {
            const localIds = new Set(prev.map(m => m.id))
            const fresh = serverMarkers.filter(m => !localIds.has(m.id) && now - m.createdAt < 10000)
            return fresh.length > 0 ? [...prev, ...fresh] : prev
          })
        } catch {}
      }
    }, 5000)
    return () => clearInterval(iv)
  }, [campaign.id, activeSession])

  // ── Coord helpers ──
  const toWorld = useCallback((sx: number, sy: number) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return {x:0,y:0}
    return { x:(sx-rect.left-pan.x)/zoom, y:(sy-rect.top-pan.y)/zoom }
  }, [pan, zoom])

  // ── Shared press logic ──
  const handlePress = useCallback((clientX: number, clientY: number, targetEl: Element|null) => {
    const tokenEl = targetEl?.closest('[data-token-id]') as HTMLElement|null
    const tokenId = tokenEl?.dataset.tokenId

    if (tool === 'select' && tokenId) {
      const tok = tokens.find(t=>t.id===tokenId)
      const hasLive = liveMembersRef.current.includes(currentMemberId)
      const canMove = isGM ||
        (hasLive && (tokenId === currentMemberId || (tok?.allowedPlayers?.includes(currentMemberId) ?? false)))
      if (!canMove) return
      const t = tok
      if (t) setTokenDrag({ tokenId, startMouseX:clientX, startMouseY:clientY, startTokenX:t.x, startTokenY:t.y })
      return
    }
    if (tool === 'move' || tool === 'select') {
      setPanDrag({ startMouseX:clientX, startMouseY:clientY, startPanX:pan.x, startPanY:pan.y })
    } else if (tool === 'token') {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const world = toWorld(clientX, clientY)
      setAddToken({ screenX:clientX-rect.left, screenY:clientY-rect.top, worldX:world.x, worldY:world.y })
      setNewTokenLabel('')
      setNewTokenColor(TOKEN_COLORS[tokens.length % TOKEN_COLORS.length] ?? TOKEN_COLORS[0]!)
    } else if (tool === 'marker') {
      const w = toWorld(clientX, clientY)
      const newMarker = { id: crypto.randomUUID(), x: w.x, y: w.y, color: '#f59e0b', createdAt: Date.now() }
      setMarkers(prev=>[...prev, newMarker])
      // Broadcast ping to all clients via session state
      if (activeSession?.isActive) {
        const allMarkers = [...markers, newMarker].filter(m => Date.now() - m.createdAt < 10000)
        fetch(`/api/campaigns/${campaign.id}/sessions/state`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ markersJson: JSON.stringify(allMarkers) }),
        }).catch(() => {})
      }
    } else if (tool === 'measure') {
      const w = toWorld(clientX, clientY)
      setMeasureAnchor(prev=>prev?null:w)
    } else if (tool === 'fog') {
      const w = toWorld(clientX, clientY)
      setFogDraw({startX:w.x,startY:w.y,endX:w.x,endY:w.y})
    } else if (tool === 'reveal') {
      const w = toWorld(clientX, clientY)
      setFogRects(prev=>prev.filter(r=>!(w.x>=r.x&&w.x<=r.x+r.w&&w.y>=r.y&&w.y<=r.y+r.h)))
    }
  }, [tool, pan, toWorld, tokens])

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (tool==='measure'||fogDraw) {
      const w = toWorld(clientX, clientY)
      if (tool==='measure') setPointerWorld(w)
      if (fogDraw) setFogDraw(prev=>prev?{...prev,endX:w.x,endY:w.y}:null)
    }
    if (panDrag) {
      setPan({x:panDrag.startPanX+clientX-panDrag.startMouseX, y:panDrag.startPanY+clientY-panDrag.startMouseY})
    } else if (tokenDrag) {
      const dx=(clientX-tokenDrag.startMouseX)/zoom, dy=(clientY-tokenDrag.startMouseY)/zoom
      setTokens(prev=>prev.map(t=>t.id===tokenDrag.tokenId
        ?{...t,x:Math.max(GRID/2,tokenDrag.startTokenX+dx),y:Math.max(GRID/2,tokenDrag.startTokenY+dy)}:t))
    }
  }, [tool, panDrag, tokenDrag, fogDraw, zoom, toWorld])

  const handleRelease = useCallback(() => {
    if (fogDraw) {
      const x=Math.min(fogDraw.startX,fogDraw.endX), y=Math.min(fogDraw.startY,fogDraw.endY)
      const w=Math.abs(fogDraw.endX-fogDraw.startX), h=Math.abs(fogDraw.endY-fogDraw.startY)
      if (w>8&&h>8) setFogRects(prev=>[...prev,{id:crypto.randomUUID(),x,y,w,h}])
      setFogDraw(null)
    }
    if (tokenDrag) {
      const snapped = tokensRef.current.map(t=>t.id===tokenDrag.tokenId?{...t,x:snap(t.x),y:snap(t.y)}:t)
      setTokens(snapped)
      syncTokens(snapped)
    }
    setPanDrag(null); setTokenDrag(null)
  }, [tokenDrag, fogDraw, syncTokens])

  // ── Mouse handlers ──
  const onCanvasDown  = useCallback((e: React.MouseEvent) => { if(e.button!==0)return; handlePress(e.clientX,e.clientY,e.target as Element) }, [handlePress])
  const onCanvasMove  = useCallback((e: React.MouseEvent) => handleMove(e.clientX,e.clientY), [handleMove])
  const onCanvasUp    = useCallback(() => handleRelease(), [handleRelease])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const rect = canvasRef.current!.getBoundingClientRect()
    const mx=e.clientX-rect.left, my=e.clientY-rect.top
    const factor = e.deltaY<0?1.12:0.89
    setZoom(prev=>{
      const next=Math.min(4,Math.max(0.25,prev*factor))
      setPan(p=>({x:mx-(mx-p.x)*(next/prev),y:my-(my-p.y)*(next/prev)}))
      return next
    })
  }, [])

  // ── Touch handlers ──
  const onCanvasTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length===2) {
      const [t1,t2]=[e.touches[0]!,e.touches[1]!]
      const dist=Math.hypot(t2.clientX-t1.clientX,t2.clientY-t1.clientY)
      const rect=canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const midX=(t1.clientX+t2.clientX)/2-rect.left
      const midY=(t1.clientY+t2.clientY)/2-rect.top
      pinchRef.current={dist,zoom,panX:pan.x,panY:pan.y,midX,midY}
      setPanDrag(null); setTokenDrag(null)
      return
    }
    const touch=e.touches[0]!
    handlePress(touch.clientX,touch.clientY,e.target as Element)
  }, [handlePress, zoom, pan])

  const onCanvasTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length===2&&pinchRef.current) {
      const [t1,t2]=[e.touches[0]!,e.touches[1]!]
      const newDist=Math.hypot(t2.clientX-t1.clientX,t2.clientY-t1.clientY)
      const scale=newDist/pinchRef.current.dist
      const newZoom=Math.min(4,Math.max(0.25,pinchRef.current.zoom*scale))
      const {midX,midY,panX,panY,zoom:initZ}=pinchRef.current
      setZoom(newZoom)
      setPan({x:midX-(midX-panX)*(newZoom/initZ),y:midY-(midY-panY)*(newZoom/initZ)})
      return
    }
    const touch=e.touches[0]!
    handleMove(touch.clientX,touch.clientY)
  }, [handleMove])

  const onCanvasTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length<2) pinchRef.current=null
    handleRelease()
  }, [handleRelease])

  // ── Token mouse ──
  const onTokenDown = useCallback((e: React.MouseEvent, tokenId: string) => {
    if (tool!=='select') return
    const tok = tokens.find(t=>t.id===tokenId)
    const hasLive = liveMembers.includes(currentMemberId)
    const canMove = isGM ||
      (hasLive && (tokenId === currentMemberId || (tok?.allowedPlayers?.includes(currentMemberId) ?? false)))
    if (!canMove) return
    e.stopPropagation()
    if (!tok) return
    setTokenDrag({tokenId,startMouseX:e.clientX,startMouseY:e.clientY,startTokenX:tok.x,startTokenY:tok.y})
  }, [tool, tokens, isGM, currentMemberId, liveMembers])

  // ── Actions ──
  function addNewToken() {
    if (!addToken) return
    const label=newTokenLabel.trim()||'Token'
    const newToken: Token = { id:crypto.randomUUID(), label, initial:label[0]?.toUpperCase()?? '?', x:snap(addToken.worldX), y:snap(addToken.worldY), type:newTokenType, color:newTokenColor }
    const next=[...tokens,newToken]
    setTokens(next)
    setAddToken(null)
    syncTokens(next)
  }

  function removeToken(id: string) {
    const next=tokens.filter(t=>t.id!==id)
    setTokens(next)
    syncTokens(next)
  }

  function placeNpcToken(npc: NpcData) {
    if (!addToken) return
    const typeColor = npc.type === 'ENEMY' ? '#ef4444' : npc.type === 'VILLAIN' ? '#ef4444' : npc.type === 'ALLY' ? '#22c55e' : '#c9a22a'
    const newToken: Token = {
      id: crypto.randomUUID(),
      label: npc.name,
      initial: npc.name[0]?.toUpperCase() ?? '?',
      x: snap(addToken.worldX), y: snap(addToken.worldY),
      type: (npc.type === 'ENEMY' || npc.type === 'VILLAIN') ? 'enemy' : 'npc',
      color: typeColor,
      hp: npc.hp,
      maxHp: npc.maxHp,
      imageUrl: npc.imageUrl,
    }
    const next = [...tokens, newToken]
    setTokens(next)
    setAddToken(null)
    setGmCustomOpen(false)
    syncTokens(next)
  }

  function rollInitiative() {
    const rolled: InitiativeEntry[] = tokens.map(t => ({
      tokenId: t.id,
      label: t.label,
      color: t.color,
      type: t.type,
      initiative: Math.floor(Math.random() * 20) + 1,
      hp: t.hp,
      maxHp: t.maxHp,
    })).sort((a, b) => b.initiative - a.initiative)
    setInitiativeOrder(rolled)
    setCurrentTurnIdx(0)
    setInitiativeOpen(true)
  }

  function nextTurn() {
    setCurrentTurnIdx(i => (i + 1) % Math.max(1, initiativeOrder.length))
  }

  async function sendChatMessage() {
    const text = chatInput.trim()
    if (!text || !activeSession?.isActive || sendingChat) return
    setSendingChat(true)
    const res = await fetch(`/api/campaigns/${campaign.id}/rolls`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ expression: 'chat', message: text }),
    }).catch(() => null)
    setSendingChat(false)
    if (!res?.ok) return
    const entry: RollLogEntry = await res.json().catch(() => null)
    if (!entry) return
    setChatInput('')
    sinceRef.current = entry.rolledAt
    setRolls(prev => [entry, ...prev].slice(0, 50))
  }

  async function rollDie(die: string) {
    if (!activeSession?.isActive||rollingDie) return
    setRollingDie(die)
    const expr = rollModifier!==0
      ? `1${die}${rollModifier>0?'+':''}${rollModifier}`
      : `1${die}`
    const res = await fetch(`/api/campaigns/${campaign.id}/rolls`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({expression:expr}),
    }).catch(()=>null)
    setRollingDie(null)
    if (!res?.ok) return
    const roll:RollLogEntry=await res.json().catch(()=>null)
    if (!roll) return
    sinceRef.current=roll.rolledAt
    setLastRollId(roll.id)
    setRolls(prev=>[roll,...prev].slice(0, 50))
    setTimeout(()=>setLastRollId(null),2000)
  }

  function applyMap() {
    const url=safeImageUrl(mapInputValue.trim())
    setMapUrl(url)
    setMapInputOpen(false)
    if (isGM && activeSession) {
      fetch(`/api/campaigns/${campaign.id}/sessions/state`, {
        method: 'PATCH',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ mapImageUrl: url }),
      }).catch(()=>{})
    }
  }

  const tools:[Tool,React.ElementType,string][] = [
    ['select',  MousePointer, 'Selecionar / Mover token'],
    ['move',    Hand,         'Mover câmera (pan)'],
    ['token',   Coins,        'Colocar token'],
    ['marker',  MapPin,       'Pingar localização'],
    ['measure', Ruler,        'Medir distância'],
    ['fog',     Cloud,        'Névoa de guerra'],
    ['reveal',  Eye,          'Revelar área'],
  ]

  const cursor = panDrag
    ? 'cursor-grabbing' : tool==='move' ? 'cursor-grab'
    : ['token','marker','measure','fog','reveal'].includes(tool) ? 'cursor-crosshair'
    : tokenDrag ? 'cursor-grabbing' : 'cursor-default'

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{background:'#080811'}}>

      {/* ── Top bar ── */}
      <div className="h-11 flex items-center justify-between px-3 sm:px-4 shrink-0 border-b border-white/5 relative z-10 bg-surface/[0.97] backdrop-blur-sm">

        {/* Left */}
        <div className="flex items-center gap-2 sm:gap-5 min-w-0">
          <Link href={`/campaign/${campaign.id}`}
                className="flex items-center gap-1.5 sm:gap-2 text-saga-muted hover:text-gold transition-colors group shrink-0">
            <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L4.862 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd"/>
            </svg>
            <span className="font-cinzel text-[13px] font-semibold text-gold/90 group-hover:text-gold truncate max-w-[100px] sm:max-w-none">{campaign.name}</span>
          </Link>
          <div className="hidden sm:block h-4 w-px bg-white/10"/>
          {activeSession?.isActive ? (
            <div className="hidden sm:flex items-center gap-2">
              <div className="pulse-dot scale-75"/>
              <span className="text-[12px] text-saga-muted">{activeSession.name?? 'Sessão ativa'}</span>
              {!isGM && liveMembers.includes(currentMemberId) && (
                <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/[0.12] text-emerald-400 border border-emerald-500/25">
                  <Wifi size={8}/> AO VIVO
                </span>
              )}
            </div>
          ) : (
            <span className="hidden sm:inline text-[12px] text-saga-dim">Mesa sem sessão</span>
          )}
          {activeSession?.isActive && <div className="sm:hidden pulse-dot scale-75 shrink-0"/>}
        </div>

        {/* Right */}
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          {/* Zoom — desktop only */}
          <div className="hidden sm:flex items-center gap-1">
            <button onClick={()=>setZoom(z=>Math.max(0.25,+(z*0.85).toFixed(2)))}
              className="w-6 h-6 rounded text-xs font-bold text-saga-muted hover:text-saga-text hover:bg-white/8 transition-all flex items-center justify-center">−</button>
            <span className="text-[11px] text-saga-dim w-10 text-center font-mono">{Math.round(zoom*100)}%</span>
            <button onClick={()=>setZoom(z=>Math.min(4,+(z*1.18).toFixed(2)))}
              className="w-6 h-6 rounded text-xs font-bold text-saga-muted hover:text-saga-text hover:bg-white/8 transition-all flex items-center justify-center">+</button>
          </div>
          <button onClick={()=>{setPan({x:80,y:60});setZoom(1)}}
            className="hidden sm:block px-2 h-6 rounded text-[10px] text-saga-dim hover:text-saga-text hover:bg-white/8 transition-all">
            Reset
          </button>
          <div className="hidden sm:block h-4 w-px bg-white/10"/>

          {/* Mapa button */}
          {isGM && <div data-mesa-tutorial="topbar-map" className="relative" ref={mapDropRef}>
            <button onClick={()=>setMapInputOpen(o=>!o)}
              className={`px-2 sm:px-3 h-7 rounded text-[11px] font-medium border transition-all flex items-center gap-1.5 ${
                mapUrl?'text-gold border-gold/50 bg-gold/10':'text-saga-muted border-white/10 hover:border-gold/40 hover:text-gold'
              }`}>
              <ImageIcon size={13}/>
              <span className="hidden sm:inline">Mapa</span>
            </button>
            {mapInputOpen && (
              <div className="absolute top-full right-0 mt-1.5 z-[60] w-72 rounded-xl border border-border shadow-2xl overflow-hidden bg-surface backdrop-blur-md">
                <div className="px-3 py-2.5 flex items-center justify-between">
                  <span className="font-cinzel text-[11px] font-bold text-saga-muted uppercase tracking-widest">Imagem do Mapa</span>
                  <button onClick={()=>setMapInputOpen(false)} className="text-saga-dim hover:text-saga-text"><X size={13}/></button>
                </div>
                <div className="p-3 flex flex-col gap-2">
                  <input
                    autoFocus
                    value={mapInputValue}
                    onChange={e=>setMapInputValue(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter')applyMap();if(e.key==='Escape')setMapInputOpen(false)}}
                    placeholder="https://... URL da imagem"
                    className="w-full px-3 py-2 rounded text-[12px] text-saga-text placeholder:text-saga-dim focus:outline-none bg-white/5 border border-white/10 focus:border-gold/60 transition-colors"
                  />
                  <div className="flex gap-2">
                    <button onClick={applyMap}
                      className="flex-1 py-1.5 rounded text-[11px] font-bold text-bg font-cinzel bg-gradient-gold">
                      Aplicar
                    </button>
                    {mapUrl && (
                      <button onClick={()=>{
                        setMapUrl(null);setMapInputValue('');setMapInputOpen(false)
                        if(isGM&&activeSession){fetch(`/api/campaigns/${campaign.id}/sessions/state`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({mapImageUrl:null})}).catch(()=>{})}
                      }}
                        className="px-3 py-1.5 rounded text-[11px] text-saga-danger border border-saga-danger/30 hover:bg-saga-danger/10 transition-colors">
                        Limpar
                      </button>
                    )}
                  </div>
                  <p className="text-[9px] text-saga-dim text-center">A imagem é renderizada na origem do mapa (0,0)</p>
                </div>
              </div>
            )}
          </div>}

          <button data-mesa-tutorial="topbar-sheets" onClick={()=>setSheetsOpen(o=>!o)}
            className={`px-2 sm:px-3 h-7 rounded text-[11px] font-medium border transition-all flex items-center gap-1.5 ${
              sheetsOpen?'text-gold border-gold/50 bg-gold/10':'text-saga-muted border-white/10 hover:border-gold/40 hover:text-gold'
            }`}>
            <ClipboardList size={13}/>
            <span className="hidden sm:inline">Fichas</span>
          </button>
          {activeSession?.isActive && (
            <button data-mesa-tutorial="topbar-initiative" onClick={()=>setInitiativeOpen(o=>!o)}
              title="Tracker de Iniciativa"
              className={`px-2 sm:px-3 h-7 rounded text-[11px] font-medium border transition-all flex items-center gap-1.5 ${
                initiativeOpen?'text-gold border-gold/50 bg-gold/10':'text-saga-muted border-white/10 hover:border-gold/40 hover:text-gold'
              }`}>
              <Swords size={13}/>
              <span className="hidden sm:inline">Iniciativa</span>
            </button>
          )}
          {activeSession?.isActive && (
            <button onClick={()=>setHandoutsOpen(o=>!o)}
              title="Handouts"
              className={`px-2 sm:px-3 h-7 rounded text-[11px] font-medium border transition-all flex items-center gap-1.5 ${
                handoutsOpen?'text-gold border-gold/50 bg-gold/10':'text-saga-muted border-white/10 hover:border-gold/40 hover:text-gold'
              }`}>
              <BookOpen size={13}/>
              <span className="hidden sm:inline">Handouts</span>
            </button>
          )}
          {isGM && (
            <button data-mesa-tutorial="topbar-music" onClick={()=>setMusicOpen(true)}
              className="px-2 sm:px-3 h-7 rounded text-[11px] font-medium border transition-all text-saga-muted border-white/10 hover:border-gold/40 hover:text-gold flex items-center gap-1.5">
              <Music size={13}/>
              <span className="hidden sm:inline">Música</span>
            </button>
          )}
          {isGM && activeSession?.isActive && (
            <div className="relative">
              <button onClick={()=>setLiveOpen(o=>!o)}
                title="Controle Ao Vivo"
                className={`px-2 sm:px-3 h-7 rounded text-[11px] font-medium border transition-all flex items-center gap-1.5 ${
                  liveOpen || liveMembers.length > 0
                    ? 'text-emerald-400 border-emerald-400/50 bg-emerald-400/10'
                    : 'text-saga-muted border-white/10 hover:border-emerald-400/40 hover:text-emerald-400'
                }`}>
                <Radio size={13}/>
                <span className="hidden sm:inline">Ao Vivo</span>
                {liveMembers.length > 0 && (
                  <span className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center bg-emerald-500 text-white">
                    {liveMembers.length}
                  </span>
                )}
              </button>

              {liveOpen && (
                <div className="absolute top-full right-0 mt-1.5 z-[60] w-72 rounded-xl border border-border shadow-2xl overflow-hidden bg-surface backdrop-blur-md">
                  <div className="px-3 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Radio size={12} className="text-emerald-400"/>
                      <span className="font-cinzel text-[11px] font-bold text-saga-muted uppercase tracking-widest">Controle Ao Vivo</span>
                    </div>
                    <button onClick={()=>setLiveOpen(false)} className="text-saga-dim hover:text-saga-text"><X size={13}/></button>
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] text-saga-dim mb-3 leading-relaxed">
                      Jogadores com "Ao Vivo" ativado podem mover tokens que todos verão em tempo real.
                    </p>
                    {members.filter(m => m.role !== 'GM').length === 0 ? (
                      <p className="text-[11px] text-saga-dim text-center py-3">Nenhum jogador na sessão.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {members.filter(m => m.role !== 'GM').map(m => {
                          const hasLive = liveMembers.includes(m.id)
                          const isExpanded = expandedLiveMember === m.id
                          const otherTokens = tokens.filter(t => t.id !== m.id)
                          function toggleLive() {
                            const next = hasLive
                              ? liveMembers.filter(id => id !== m.id)
                              : [...liveMembers, m.id]
                            setLiveMembers(next)
                            if (!next.includes(m.id)) setExpandedLiveMember(e => e === m.id ? null : e)
                            fetch(`/api/campaigns/${campaign.id}/sessions/state`, {
                              method: 'PATCH',
                              headers: {'Content-Type':'application/json'},
                              body: JSON.stringify({ liveMembersJson: JSON.stringify(next) }),
                            }).catch(() => {})
                          }
                          function toggleTokenPermission(tokenId: string) {
                            const updated = tokens.map(t => {
                              if (t.id !== tokenId) return t
                              const allowed = t.allowedPlayers ?? []
                              const hasPerm = allowed.includes(m.id)
                              return { ...t, allowedPlayers: hasPerm ? allowed.filter(id => id !== m.id) : [...allowed, m.id] }
                            })
                            setTokens(updated)
                            syncTokens(updated)
                          }
                          return (
                            <div key={m.id} className="space-y-1">
                              <div
                                className={`flex items-center justify-between px-3 py-2 rounded transition-all border ${
                                  hasLive ? 'bg-emerald-500/[0.08] border-emerald-500/25' : 'bg-white/[0.03] border-white/[0.07]'
                                }`}>
                                <div className="flex items-center gap-2">
                                  {hasLive
                                    ? <Wifi size={11} className="text-emerald-400 shrink-0"/>
                                    : <WifiOff size={11} className="text-saga-dim shrink-0"/>
                                  }
                                  <div>
                                    <p className="text-[12px] font-medium text-saga-text">{m.character?.name ?? m.user.username}</p>
                                    {m.character?.name && (
                                      <p className="text-[9px] text-saga-dim">{m.user.username}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {hasLive && otherTokens.length > 0 && (
                                    <button
                                      onClick={() => setExpandedLiveMember(isExpanded ? null : m.id)}
                                      title="Tokens extras que este jogador pode mover"
                                      className={`text-[9px] px-1.5 py-0.5 rounded transition-all border ${isExpanded ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' : 'text-saga-dim border-white/10 hover:text-emerald-400 hover:border-emerald-400/20'}`}>
                                      Tokens
                                    </button>
                                  )}
                                  <button onClick={toggleLive}
                                    className={`relative w-9 h-5 rounded-full transition-all shrink-0 ${hasLive ? 'bg-emerald-500' : 'bg-white/10'}`}>
                                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${hasLive ? 'left-4' : 'left-0.5'}`}/>
                                  </button>
                                </div>
                              </div>
                              {hasLive && isExpanded && otherTokens.length > 0 && (
                                <div className="ml-2 px-2.5 py-2 rounded border border-emerald-400/10 space-y-1.5 bg-emerald-500/[0.04]">
                                  <p className="text-[9px] text-saga-dim">Tokens extras que <span className="text-saga-muted">{m.character?.name ?? m.user.username}</span> pode mover:</p>
                                  {otherTokens.map(t => {
                                    const checked = (t.allowedPlayers ?? []).includes(m.id)
                                    return (
                                      <label key={t.id} className="flex items-center gap-2 cursor-pointer group">
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => toggleTokenPermission(t.id)}
                                          className="accent-emerald-500 w-3 h-3 shrink-0"
                                        />
                                        <span className={`text-[11px] transition-colors truncate ${checked ? 'text-emerald-300' : 'text-saga-muted group-hover:text-saga-text'}`}>
                                          {t.label}
                                        </span>
                                      </label>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {liveMembers.length > 0 && (
                      <button
                        onClick={() => {
                          setLiveMembers([])
                          fetch(`/api/campaigns/${campaign.id}/sessions/state`, {
                            method: 'PATCH',
                            headers: {'Content-Type':'application/json'},
                            body: JSON.stringify({ liveMembersJson: '[]' }),
                          }).catch(() => {})
                        }}
                        className="mt-3 w-full py-1.5 rounded text-[11px] text-saga-dim hover:text-saga-danger transition-colors border border-white/6 hover:border-saga-danger/30">
                        Desativar todos
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Chat toggle — mobile only */}
          <button onClick={()=>setChatOpen(o=>!o)}
            className={`sm:hidden px-2 h-7 rounded border transition-all flex items-center ${
              chatOpen?'text-gold border-gold/50 bg-gold/10':'text-saga-muted border-white/10'
            }`}>
            <MessageSquare size={13}/>
          </button>
          <button
            onClick={() => window.dispatchEvent(new Event('saga:mesa-tutorial'))}
            title="Ver tutorial da Mesa Virtual"
            className="w-7 h-7 rounded-full flex items-center justify-center text-saga-dim hover:text-gold transition-colors hover:bg-white/6"
          >
            <HelpCircle size={13}/>
          </button>
          {isGM&&activeSession?.isActive&&<EndSessionButton campaignId={campaign.id} compact/>}
        </div>
      </div>

      {/* ── Main ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* ── Left toolbar ── */}
        <div data-mesa-tutorial="toolbar" className="w-12 flex flex-col items-center py-2 gap-0.5 shrink-0 border-r border-white/5 z-10 bg-bg/[0.92]">
          {tools.map(([t,Icon,label])=>(
            <button key={t}
              onClick={()=>{setTool(t);setAddToken(null);if(t!=='measure')setMeasureAnchor(null)}}
              title={label}
              className={`w-8 h-8 rounded flex items-center justify-center transition-all relative group
                ${tool===t?'bg-gold/20 text-gold ring-1 ring-gold/40':'text-saga-dim hover:text-saga-text hover:bg-white/6'}`}>
              <Icon size={15}/>
              <span className="absolute left-full ml-2 px-2 py-1 rounded bg-surface border border-border text-[10px] text-saga-text whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg hidden sm:block">
                {label}
              </span>
            </button>
          ))}
          <div className="w-5 h-px bg-white/8 my-1"/>
          <div className="w-8 h-8 flex items-center justify-center">
            <span className="text-[8px] text-saga-dim text-center leading-tight uppercase tracking-wider">
              {tool==='select'?'Drag\nToken':tool==='move'?'Pan\nMap':tool==='token'?'Tap\nMap':tool.slice(0,6)}
            </span>
          </div>
        </div>

        {/* ── Canvas ── */}
        <div
          data-mesa-tutorial="canvas"
          ref={canvasRef}
          className={`flex-1 relative overflow-hidden ${cursor}`}
          style={{
            backgroundImage:`linear-gradient(rgba(90,90,140,0.28) 1px,transparent 1px),linear-gradient(90deg,rgba(90,90,140,0.28) 1px,transparent 1px)`,
            backgroundSize:`${GRID*zoom}px ${GRID*zoom}px`,
            backgroundPosition:`${pan.x%(GRID*zoom)}px ${pan.y%(GRID*zoom)}px`,
            backgroundColor:'#0a0a18',
            touchAction:'none',
          }}
          onMouseDown={onCanvasDown}
          onMouseMove={onCanvasMove}
          onMouseUp={onCanvasUp}
          onMouseLeave={onCanvasUp}
          onWheel={onWheel}
          onTouchStart={onCanvasTouchStart}
          onTouchMove={onCanvasTouchMove}
          onTouchEnd={onCanvasTouchEnd}
          onTouchCancel={onCanvasTouchEnd}
        >
          {/* ── World container ── */}
          <div className="absolute" style={{transformOrigin:'0 0',transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`}}>

            {/* Map background image */}
            {safeImageUrl(mapUrl) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={safeImageUrl(mapUrl)!} alt="mapa"
                className="absolute top-0 left-0 select-none pointer-events-none"
                style={{maxWidth:'none',opacity:0.9}}
                draggable={false}
              />
            )}

            {/* Tokens */}
            {tokens.map(t=>{
              const isDragging=tokenDrag?.tokenId===t.id
              const isCurrentTurn=initiativeOrder[currentTurnIdx]?.tokenId===t.id && initiativeOpen
              const hpPct = t.hp !== undefined && t.maxHp && t.maxHp > 0
                ? Math.max(0, Math.min(100, (t.hp / t.maxHp) * 100)) : null
              return (
                <div key={t.id}
                  data-token-id={t.id}
                  className="absolute flex flex-col items-center gap-1 select-none"
                  style={{left:t.x,top:t.y,transform:'translate(-50%,-50%)',
                    cursor:tool==='select'?(isDragging?'grabbing':'grab'):'default',
                    zIndex:isDragging?100:10}}
                  onMouseDown={e=>onTokenDown(e,t.id)}
                  onContextMenu={e=>{e.preventDefault();if(tool==='select'&&isGM)removeToken(t.id)}}
                >
                  <div className="relative w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold text-white"
                    style={{
                      background:safeImageUrl(t.imageUrl??null)?'transparent':t.type==='enemy'
                        ?'radial-gradient(circle at 35% 35%,#f87171,#dc2626)'
                        :t.type==='npc'
                          ?`radial-gradient(circle at 35% 35%,${t.color}cc,${t.color}88)`
                          :`radial-gradient(circle at 35% 35%,${t.color}dd,${t.color})`,
                      boxShadow:isDragging
                        ?`0 0 0 2px white,0 0 0 4px ${t.color},0 8px 24px ${t.color}66`
                        :isCurrentTurn
                          ?`0 0 0 2px #f0d060,0 0 0 4px rgba(240,208,96,0.4),0 4px 16px rgba(240,208,96,0.5)`
                          :`0 0 0 1.5px ${t.color}88,0 2px 8px rgba(0,0,0,0.6)`,
                    }}>
                    {safeImageUrl(t.imageUrl??null)
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={safeImageUrl(t.imageUrl??null)!} alt={t.label} className="w-full h-full object-cover"/>
                      : t.initial
                    }
                    {isDragging&&<div className="absolute inset-0 rounded-full animate-ping opacity-30" style={{background:t.color}}/>}
                    {isCurrentTurn&&<div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-300 border border-yellow-500 flex items-center justify-center">
                      <span className="text-[5px] font-black text-yellow-900">▶</span>
                    </div>}
                  </div>
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-sm whitespace-nowrap max-w-[80px] truncate bg-black/70 backdrop-blur-sm border"
                    style={{color:t.color,borderColor:`${t.color}44`}}>
                    {t.label}
                  </span>
                  {/* HP bar */}
                  {hpPct !== null && (
                    <div className="w-10 h-[3px] rounded-full overflow-hidden bg-black/60">
                      <div className={`h-full rounded-full transition-all duration-300 ${
                        hpPct > 50 ? 'bg-saga-success' : hpPct > 25 ? 'bg-saga-warning' : 'bg-saga-danger'
                      }`} style={{width:`${hpPct}%`}} />
                    </div>
                  )}
                </div>
              )
            })}

            {/* Markers */}
            {markers.map(m=>{
              const age=(Date.now()-m.createdAt)/10000
              const opacity=Math.max(0,1-age)
              return (
                <div key={m.id} className="absolute pointer-events-none"
                  style={{left:m.x,top:m.y,transform:'translate(-50%,-50%)',opacity,zIndex:30}}>
                  <div className="w-6 h-6 rounded-full border-2 animate-ping" style={{borderColor:m.color,animationDuration:'0.8s'}}/>
                  <div className="absolute inset-0 rounded-full" style={{background:m.color,opacity:0.4}}/>
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
                    <div className="w-0.5 h-4 mx-auto" style={{background:m.color,opacity:0.8}}/>
                  </div>
                </div>
              )
            })}

            {/* Fog */}
            {fogRects.map(rect=>(
              <div key={rect.id} className="absolute pointer-events-none"
                style={{left:rect.x,top:rect.y,width:rect.w,height:rect.h,background:'rgba(0,0,0,0.88)',border:'1px solid rgba(255,255,255,0.04)'}}/>
            ))}
            {fogDraw&&(()=>{
              const x=Math.min(fogDraw.startX,fogDraw.endX),y=Math.min(fogDraw.startY,fogDraw.endY)
              const w=Math.abs(fogDraw.endX-fogDraw.startX),h=Math.abs(fogDraw.endY-fogDraw.startY)
              return <div className="absolute pointer-events-none"
                style={{left:x,top:y,width:w,height:h,background:'rgba(0,0,0,0.5)',border:'2px dashed rgba(201,162,42,0.6)'}}/>
            })()}
          </div>

          {/* ── Measure overlay (screen space) ── */}
          {tool==='measure'&&measureAnchor&&(
            <svg className="absolute inset-0 pointer-events-none z-20" style={{width:'100%',height:'100%'}}>
              {(()=>{
                const ax=measureAnchor.x*zoom+pan.x, ay=measureAnchor.y*zoom+pan.y
                const bx=pointerWorld.x*zoom+pan.x, by=pointerWorld.y*zoom+pan.y
                const dx=(pointerWorld.x-measureAnchor.x)/GRID, dy=(pointerWorld.y-measureAnchor.y)/GRID
                const dist=Math.sqrt(dx*dx+dy*dy)
                const mx=(ax+bx)/2, my=(ay+by)/2
                return (
                  <>
                    <line x1={ax} y1={ay} x2={bx} y2={by} stroke="rgba(240,208,96,0.8)" strokeWidth="2" strokeDasharray="6,3"/>
                    <circle cx={ax} cy={ay} r="4" fill="#f0d060"/>
                    <circle cx={bx} cy={by} r="4" fill="#f0d060"/>
                    <rect x={mx-26} y={my-11} width="52" height="22" rx="4" fill="rgba(0,0,0,0.8)"/>
                    <text x={mx} y={my+4} textAnchor="middle" fill="#f0d060" fontSize="11" fontFamily="monospace">{dist.toFixed(1)}u</text>
                  </>
                )
              })()}
            </svg>
          )}

          {/* ── No session banner — não bloqueia o canvas para o estado ser visível ── */}
          {!activeSession?.isActive&&(
            <div data-mesa-tutorial="session-banner" className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2.5 rounded-xl shadow-2xl bg-surface/95 border border-gold/25 backdrop-blur-md">
              <Map size={15} className="text-saga-dim shrink-0"/>
              <span className="text-[12px] text-saga-muted">
                {isGM?'Nenhuma sessão ativa':'Aguardando o Mestre iniciar a sessão'}
              </span>
              {isGM&&(
                <button onClick={()=>setStartSessionOpen(true)}
                  className="px-3 py-1 rounded text-[11px] font-cinzel font-semibold text-bg flex items-center gap-1.5 shrink-0 bg-gradient-gold">
                  <Play size={10}/>Iniciar
                </button>
              )}
            </div>
          )}

          {/* ── Sheets panel ── */}
          {sheetsOpen&&(
            <CharacterSheetPanel
              onClose={()=>setSheetsOpen(false)}
              members={members} npcs={npcs} currentMemberId={currentMemberId}
              isGM={isGM} campaignId={campaign.id} systemName={systemName}
              hpOverrides={hpOverrides}
              onHpChange={(id, hp) => setHpOverrides(prev => ({ ...prev, [id]: hp }))}
            />
          )}

          {/* ── Initiative Tracker ── */}
          {initiativeOpen&&(
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 w-72 rounded-xl overflow-hidden shadow-2xl bg-bg/[0.97] border border-gold/25 backdrop-blur-md"
              onWheel={e => e.stopPropagation()}>
              <div className="px-4 py-2.5 border-b border-gold/20 flex items-center justify-between bg-gold/[0.06]">
                <div className="flex items-center gap-2">
                  <Swords size={12} className="text-gold"/>
                  <span className="font-cinzel text-[11px] font-bold text-gold uppercase tracking-widest">Iniciativa</span>
                  {initiativeOrder.length>0&&(
                    <span className="text-[9px] text-saga-dim">
                      Turno {(currentTurnIdx%Math.max(1,initiativeOrder.length))+1}/{initiativeOrder.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {isGM&&(
                    <button onClick={rollInitiative}
                      className="px-2 py-0.5 rounded text-[9px] font-bold font-cinzel transition-all bg-gold/15 text-gold border border-gold/30">
                      Rolar
                    </button>
                  )}
                  {initiativeOrder.length>0&&isGM&&(
                    <button onClick={nextTurn}
                      className="px-2 py-0.5 rounded text-[9px] font-bold font-cinzel flex items-center gap-1 transition-all bg-white/[0.06] text-saga-muted border border-white/10">
                      <ChevronRight size={10}/>Próximo
                    </button>
                  )}
                  <button onClick={()=>setInitiativeOpen(false)} className="text-saga-dim hover:text-saga-text ml-1">
                    <X size={13}/>
                  </button>
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {initiativeOrder.length===0?(
                  <div className="py-6 text-center">
                    <p className="text-[11px] text-saga-dim">Nenhuma ordem de iniciativa.</p>
                    {isGM&&<p className="text-[10px] text-saga-dim/60 mt-1">Clique em "Rolar" para sortear.</p>}
                  </div>
                ):initiativeOrder.map((entry,i)=>{
                  const isCurrent=i===currentTurnIdx%initiativeOrder.length
                  const hpPct = entry.hp !== undefined && entry.maxHp && entry.maxHp > 0
                    ? Math.max(0, Math.min(100, (entry.hp / entry.maxHp) * 100)) : null
                  return (
                    <div key={entry.tokenId}
                      className="px-4 py-2.5 border-b last:border-0 transition-all"
                      style={{
                        borderColor:'rgba(255,255,255,0.04)',
                        background:isCurrent?'rgba(201,162,42,0.08)':'transparent',
                      }}>
                      <div className="flex items-center gap-3">
                        {/* Initiative badge */}
                        <div className="w-7 h-7 rounded-full flex items-center justify-center font-cinzel font-bold text-sm shrink-0"
                          style={{
                            background:isCurrent?`${entry.color}30`:'rgba(255,255,255,0.05)',
                            border:`1.5px solid ${isCurrent?entry.color:'rgba(255,255,255,0.1)'}`,
                            color:isCurrent?entry.color:'#7878a0',
                          }}>
                          {entry.initiative}
                        </div>
                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {isCurrent&&<span className="text-[8px] text-yellow-300 font-bold">▶</span>}
                            <span className={`text-[12px] font-medium truncate ${isCurrent?'text-saga-text':'text-saga-muted'}`}>
                              {entry.label}
                            </span>
                          </div>
                          {hpPct !== null && (
                            <div className="mt-1 w-full h-[3px] rounded-full overflow-hidden bg-white/8">
                              <div className={`h-full rounded-full ${
                                hpPct > 50 ? 'bg-saga-success' : hpPct > 25 ? 'bg-saga-warning' : 'bg-saga-danger'
                              }`} style={{width:`${hpPct}%`}} />
                            </div>
                          )}
                        </div>
                        {/* HP text */}
                        {entry.hp !== undefined && entry.maxHp !== undefined && (
                          <span className={`text-[9px] font-mono shrink-0 ${
                            hpPct && hpPct > 50 ? 'text-green-400' : hpPct && hpPct > 25 ? 'text-amber-400' : 'text-red-400'
                          }`}>
                            {entry.hp}/{entry.maxHp}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Handouts Panel ── */}
          {handoutsOpen && (
            <HandoutsPanel
              campaignId={campaign.id}
              isGM={isGM}
              onClose={() => setHandoutsOpen(false)}
              activeSessionId={activeSession?.id}
            />
          )}

          {/* ── Add-token popover ── */}
          {addToken&&(
            <div className="absolute z-50 rounded-xl border border-border shadow-2xl overflow-hidden bg-surface backdrop-blur-md"
              style={{
                left:Math.min(addToken.screenX+8,(canvasRef.current?.offsetWidth??600)-240),
                top:Math.min(addToken.screenY+8,(canvasRef.current?.offsetHeight??400)-(isGM?320:260)),
                width:236,
              }}
              onMouseDown={e=>e.stopPropagation()}>
              <div className="px-3 py-2.5 border-b border-white/6 flex items-center justify-between">
                <span className="font-cinzel text-[11px] font-bold text-saga-muted uppercase tracking-widest">
                  {isGM?'Colocar Token':'Novo Token'}
                </span>
                <button onClick={()=>{setAddToken(null);setGmCustomOpen(false)}} className="text-saga-dim hover:text-saga-text"><X size={14}/></button>
              </div>

              {isGM ? (
                /* ── GM: NPC picker ── */
                <div className="flex flex-col">
                  {npcs.length===0 ? (
                    <p className="text-[11px] text-saga-dim text-center py-6">Nenhum NPC criado nesta campanha</p>
                  ) : (
                    <div className="max-h-52 overflow-y-auto p-1.5 flex flex-col gap-0.5">
                      {npcs.map(npc=>{
                        const tc=npc.type==='ENEMY'||npc.type==='VILLAIN'?'#ef4444':npc.type==='ALLY'?'#22c55e':'#c9a22a'
                        const typeLabel=npc.type==='ENEMY'||npc.type==='VILLAIN'?'Inimigo':npc.type==='ALLY'?'Aliado':'Neutro'
                        const hpPct=npc.maxHp>0?Math.max(0,Math.min(100,(npc.hp/npc.maxHp)*100)):0
                        return (
                          <button key={npc.id} onClick={()=>placeNpcToken(npc)}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-all text-left w-full">
                            {safeImageUrl(npc.imageUrl)
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={safeImageUrl(npc.imageUrl)!} alt={npc.name} className="w-7 h-7 rounded-full object-cover shrink-0"/>
                              : <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
                                  style={{background:`${tc}22`,border:`1px solid ${tc}55`,color:tc}}>
                                  {npc.name[0]?.toUpperCase()??'?'}
                                </div>
                            }
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-medium text-saga-text truncate leading-tight">{npc.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] font-medium" style={{color:tc}}>{typeLabel}</span>
                                <div className="flex-1 h-[3px] rounded-full overflow-hidden bg-white/8">
                                  <div className={`h-full rounded-full ${hpPct>50?'bg-saga-success':hpPct>25?'bg-saga-warning':'bg-saga-danger'}`} style={{width:`${hpPct}%`}}/>
                                </div>
                                <span className="text-[9px] text-saga-dim shrink-0">{npc.hp}/{npc.maxHp}</span>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                  {/* Custom token fallback */}
                  <div className="border-t border-white/6">
                    <button onClick={()=>setGmCustomOpen(o=>!o)}
                      className="w-full px-3 py-2 text-[10px] text-saga-dim hover:text-saga-text transition-colors flex items-center justify-center gap-1">
                      <Plus size={10}/> Token Personalizado
                    </button>
                    {gmCustomOpen&&(
                      <div className="p-2.5 pt-0 flex flex-col gap-2">
                        <input autoFocus value={newTokenLabel} onChange={e=>setNewTokenLabel(e.target.value)}
                          onKeyDown={e=>{if(e.key==='Enter')addNewToken();if(e.key==='Escape')setAddToken(null)}}
                          placeholder="Nome do token..."
                          className="w-full px-2 py-1.5 rounded text-xs text-saga-text placeholder:text-saga-dim focus:outline-none bg-white/5 border border-white/10 focus:border-gold/60 transition-colors"/>
                        <div className="flex gap-1">
                          {(['player','enemy','npc'] as const).map(tp=>(
                            <button key={tp} onClick={()=>setNewTokenType(tp)}
                              className={`flex-1 py-1 rounded text-[9px] font-medium uppercase transition-all border ${
                                newTokenType===tp
                                  ? tp==='player' ? 'bg-purple/40 border-purple/60 text-white'
                                    : tp==='enemy' ? 'bg-saga-danger/40 border-saga-danger/50 text-white'
                                    : 'bg-gold/30 border-gold/50 text-white'
                                  : 'bg-white/[0.04] border-white/8 text-saga-dim'
                              }`}>
                              {tp==='player'?'Jogador':tp==='enemy'?'Inimigo':'NPC'}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {TOKEN_COLORS.map(c=>(
                            <button key={c} onClick={()=>setNewTokenColor(c)} className="w-4 h-4 rounded-full transition-all"
                              style={{background:c,boxShadow:newTokenColor===c?'0 0 0 2px rgba(255,255,255,0.9)':'none',transform:newTokenColor===c?'scale(1.2)':'scale(1)'}}/>
                          ))}
                        </div>
                        <button onClick={addNewToken}
                          className="w-full py-1.5 rounded text-[11px] font-bold text-bg font-cinzel bg-gradient-gold">
                          Colocar no Mapa
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ── Jogador: form genérico ── */
                <div className="p-3 flex flex-col gap-3">
                  <input autoFocus value={newTokenLabel} onChange={e=>setNewTokenLabel(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter')addNewToken();if(e.key==='Escape')setAddToken(null)}}
                    placeholder="Nome do token..."
                    className="w-full px-3 py-2 rounded text-sm text-saga-text placeholder:text-saga-dim focus:outline-none bg-white/5 border border-white/10 focus:border-gold/60 transition-colors"/>
                  <div className="flex gap-1.5">
                    {(['player','enemy','npc'] as const).map(tp=>(
                      <button key={tp} onClick={()=>setNewTokenType(tp)}
                        className={`flex-1 py-1.5 rounded text-[10px] font-medium uppercase transition-all border ${
                          newTokenType===tp
                            ? tp==='player' ? 'bg-purple/40 border-purple/60 text-white'
                              : tp==='enemy' ? 'bg-saga-danger/40 border-saga-danger/50 text-white'
                              : 'bg-gold/30 border-gold/50 text-white'
                            : 'bg-white/[0.04] border-white/8 text-saga-dim'
                        }`}>
                        {tp==='player'?'Jogador':tp==='enemy'?'Inimigo':'NPC'}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {TOKEN_COLORS.map(c=>(
                      <button key={c} onClick={()=>setNewTokenColor(c)} className="w-5 h-5 rounded-full transition-all"
                        style={{background:c,boxShadow:newTokenColor===c?'0 0 0 2px rgba(255,255,255,0.9)':'none',transform:newTokenColor===c?'scale(1.2)':'scale(1)'}}/>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{background:newTokenColor}}>
                      {(newTokenLabel[0]??'?').toUpperCase()}
                    </div>
                    <button onClick={addNewToken}
                      className="flex-1 py-1.5 rounded text-[11px] font-bold text-bg font-cinzel bg-gradient-gold">
                      Colocar no Mapa
                    </button>
                  </div>
                  <p className="text-[9px] text-saga-dim text-center">Clique direito no token para remover</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Chat panel ── */}
        {chatOpen&&<div className="sm:hidden fixed inset-0 bg-black/50 z-40" onClick={()=>setChatOpen(false)}/>}
        <div className={`
          absolute sm:relative inset-y-0 right-0 z-50 sm:z-auto
          w-[300px] flex flex-col shrink-0 border-l border-white/5
          bg-bg transition-transform duration-300
          ${chatOpen?'translate-x-0':'-translate-x-0 sm:translate-x-0'}
          hidden sm:flex ${chatOpen?'!flex':''}
        `}>

          <div className="px-4 py-3 border-b border-white/6 shrink-0 flex items-center justify-between">
            <span className="font-cinzel text-[11px] font-bold text-saga-muted uppercase tracking-widest">Chat da Sessão</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-saga-dim font-medium">{members.length} membros</span>
              </div>
              <button onClick={()=>setChatOpen(false)} className="sm:hidden text-saga-dim hover:text-saga-text ml-1">
                <X size={14}/>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {rolls.length===0&&(
              <div className="flex flex-col items-center justify-center h-32 gap-2 opacity-50">
                <Dice6 size={28} className="text-saga-dim"/>
                <p className="text-[11px] text-saga-dim text-center">{activeSession?.isActive?'Nenhuma rolagem ainda.':'Inicie uma sessão.'}</p>
              </div>
            )}
            {[...rolls].reverse().map(roll=>{
              const isChat = roll.expression === 'chat'
              if (isChat) {
                return (
                  <div key={roll.id} className="flex gap-2 items-start">
                    <div className="w-5 h-5 rounded-full bg-purple/60 flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5">
                      {roll.rolledBy[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5 mb-0.5">
                        <span className="text-[10px] font-medium text-saga-muted">{roll.rolledBy}</span>
                        <span className="text-[9px] text-saga-dim">{timeAgo(roll.rolledAt)}</span>
                      </div>
                      <p className="text-[12px] text-saga-text leading-relaxed break-words">{roll.attribute}</p>
                    </div>
                  </div>
                )
              }
              const arr=Array.isArray(roll.rolls)?(roll.rolls as number[]):[]
              const isCrit=arr.length===1&&arr[0]===20&&roll.expression.includes('d20')
              const isFail=arr.length===1&&arr[0]===1&&roll.expression.includes('d20')
              const isNew=roll.id===lastRollId
              return (
                <div key={roll.id}
                  className={`rounded-lg overflow-hidden transition-all duration-300 border ${isNew?'scale-[1.02]':'scale-100'} ${
                    isCrit ? 'bg-gradient-to-br from-gold/12 to-gold/[0.04] border-gold/30 shadow-[0_0_14px_rgba(201,162,42,0.12)]'
                    : isFail ? 'bg-gradient-to-br from-saga-danger/12 to-saga-danger/[0.04] border-saga-danger/25'
                    : 'bg-white/[0.03] border-white/[0.06]'
                  }`}>
                  {(isCrit||isFail)&&(
                    <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest font-cinzel text-center flex items-center justify-center gap-1 ${isCrit?'bg-gold/12 text-gold':'bg-saga-danger/12 text-saga-danger'}`}>
                      {isCrit?<><Sparkles size={10}/>Crítico!</>:<><Skull size={10}/>Falha Crítica</>}
                    </div>
                  )}
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-purple/60 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                          {roll.rolledBy[0]?.toUpperCase()}
                        </div>
                        <p className="text-[11px] text-saga-muted truncate max-w-[100px]">{roll.rolledBy}</p>
                      </div>
                      <span className="text-[9px] text-saga-dim">{timeAgo(roll.rolledAt)}</span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-1.5">
                      <p className={`font-cinzel text-4xl font-bold leading-none ${isCrit?'text-gold':isFail?'text-saga-danger':'text-saga-text'}`}
                         style={isCrit?{textShadow:'0 0 20px rgba(201,162,42,0.5)'}:undefined}>
                        {roll.total}
                      </p>
                      {roll.attribute&&(
                        <span className="text-[10px] text-purple-bright bg-purple-dim border border-purple/20 px-1.5 py-0.5 rounded">{roll.attribute}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-saga-dim font-mono">
                      {roll.expression} → [<span className={isCrit?'text-gold':isFail?'text-saga-danger':'text-saga-muted'}>{arr.join(', ')}</span>]
                      {roll.modifier!==0?` ${roll.modifier>0?'+':''}${roll.modifier}`:''}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={chatEndRef}/>
          </div>

          {/* Input + Dice bar */}
          <div data-mesa-tutorial="dice" className="shrink-0 border-t border-white/[0.07] bg-black/25">
            <div className="px-3 pt-2.5 pb-1 flex gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendChatMessage() } }}
                disabled={!activeSession?.isActive || sendingChat}
                placeholder={activeSession?.isActive ? 'Escreva uma mensagem...' : 'Inicie uma sessão para conversar'}
                className="flex-1 rounded px-3 py-2 text-[12px] text-saga-text placeholder:text-saga-dim focus:outline-none focus:border-gold/60 disabled:opacity-40 bg-white/5 border border-white/8 transition-colors"
              />
              <button
                onClick={() => void sendChatMessage()}
                disabled={!activeSession?.isActive || !chatInput.trim() || sendingChat}
                className="px-2.5 rounded text-[11px] font-medium text-saga-dim hover:text-saga-text hover:bg-white/10 disabled:opacity-30 transition-all shrink-0 bg-white/5">
                <Send size={13}/>
              </button>
            </div>
            <div className="px-3 pb-2.5 pt-1">
              {/* Modifier row */}
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] text-saga-dim uppercase tracking-widest font-bold">Rolar Dado</p>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-saga-dim">Mod</span>
                  <button onClick={()=>setRollModifier(m=>m-1)}
                    className="w-4 h-4 rounded flex items-center justify-center text-saga-dim hover:text-saga-text hover:bg-white/8 transition-all">
                    <Minus size={9}/>
                  </button>
                  <span className={`text-[10px] font-mono font-bold w-7 text-center ${rollModifier>0?'text-saga-success':rollModifier<0?'text-saga-danger':'text-saga-dim'}`}>
                    {rollModifier>=0?'+':''}{rollModifier}
                  </span>
                  <button onClick={()=>setRollModifier(m=>m+1)}
                    className="w-4 h-4 rounded flex items-center justify-center text-saga-dim hover:text-saga-text hover:bg-white/8 transition-all">
                    <Plus size={9}/>
                  </button>
                  {rollModifier!==0&&(
                    <button onClick={()=>setRollModifier(0)}
                      className="text-[8px] text-saga-dim hover:text-saga-danger transition-colors ml-0.5">✕</button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {DICE.map(die=>{
                  const rolling=rollingDie===die
                  return (
                    <button key={die} onClick={()=>void rollDie(die)}
                      disabled={!activeSession?.isActive||!!rollingDie}
                      title={`Rolar 1${die}${rollModifier!==0?(rollModifier>0?'+':'')+rollModifier:''}`}
                      className={`h-9 rounded flex flex-col items-center justify-center gap-0.5 transition-all select-none border ${
                        !activeSession?.isActive||rollingDie?'opacity-30 cursor-not-allowed':'hover:scale-105 active:scale-95'
                      } ${rolling?'bg-gold/15 border-gold/45 ring-1 ring-gold/60':'bg-white/[0.04] border-white/8'}`}>
                      <Dice6 size={9} className="text-saga-dim"/>
                      <span className="text-[10px] font-cinzel font-bold text-gold leading-none">{die}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden music iframe for non-GM players — plays whatever GM set */}
      {!isGM && sessionMusic.youtubeId && (
        <iframe
          key={sessionMusic.youtubeId}
          src={`https://www.youtube.com/embed/${sessionMusic.youtubeId}?autoplay=1&loop=1&playlist=${sessionMusic.youtubeId}&controls=0&disablekb=1&modestbranding=1`}
          allow="autoplay"
          className="w-0 h-0 fixed opacity-0 pointer-events-none"
          title="session-music"
        />
      )}
      <MesaSpotlight isGM={isGM} />
      <MarkTutorialVisited tutorialKey="saga_visited_mesa" />
      {isGM&&<StartSessionModal campaignId={campaign.id} open={startSessionOpen} onClose={()=>setStartSessionOpen(false)}/>}
      {isGM&&<MusicPlayer
        open={musicOpen}
        onClose={()=>setMusicOpen(false)}
        onMusicChange={(youtubeId, volume) => {
          setSessionMusic({ youtubeId, volume })
          fetch(`/api/campaigns/${campaign.id}/sessions/state`, {
            method: 'PATCH',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ musicYoutubeId: youtubeId, musicVolume: volume }),
          }).catch(()=>{})
        }}
      />}
    </div>
  )
}
