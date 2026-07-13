'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { StartSessionModal } from '@/components/gm/StartSessionModal'
import { EndSessionButton } from '@/components/gm/EndSessionButton'
import { MusicPlayer } from './MusicPlayer'
import { CharacterSheetPanel } from './CharacterSheetPanel'
import { HandoutsPanel } from './HandoutsPanel'
import type { SheetCategory } from '@/lib/system-category'
import { InitiativeTracker } from './InitiativeTracker'
import { LiveControlPanel } from './LiveControlPanel'
import { RollLog } from './RollLog'
import { DiceBar } from './DiceBar'
import { AddTokenPopover } from './AddTokenPopover'
import {
  MousePointer, Hand, Coins, MapPin, Ruler, Cloud, Eye,
  ClipboardList, Music, Map, Play, X,
  MessageSquare, Image as ImageIcon, Swords, BookOpen, HelpCircle,
  Radio, Wifi,
} from 'lucide-react'
import { safeImageUrl } from '@/lib/safe-url'
import { MesaSpotlight } from '@/components/tutorial/MesaSpotlight'
import { MarkTutorialVisited } from '@/components/tutorial/MarkTutorialVisited'
import { Fleuron } from '@/components/landing/Ornament'
import {
  GRID, TOKEN_COLORS, snap, initTokens,
  type Tool, type Token, type InitiativeEntry, type Marker, type RollLogEntry,
  type Member, type NpcData, type Campaign, type SessionState, type ActiveSession,
  type AddTokenState,
} from './types'

interface VirtualTableProps {
  campaign: Campaign; activeSession: ActiveSession | null
  members: Member[]; npcs: NpcData[]; initialRolls: RollLogEntry[]
  isGM: boolean; currentMemberId: string; systemName: string | null
  systemCategory: SheetCategory
}

interface TokenDrag { tokenId: string; startMouseX: number; startMouseY: number; startTokenX: number; startTokenY: number }
interface PanDrag   { startMouseX: number; startMouseY: number; startPanX: number; startPanY: number }
interface PinchState { dist: number; zoom: number; panX: number; panY: number; midX: number; midY: number }

export function VirtualTable({ campaign, activeSession, members, npcs, initialRolls, isGM, currentMemberId, systemName, systemCategory }: VirtualTableProps) {
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

  // Rola 1d20 + modificador para um atributo específico (de personagem ou NPC),
  // registrando o rótulo (ex.: "Malachor · Constituição") no log.
  async function rollAttribute(label: string, modifier: number) {
    if (!activeSession?.isActive) return
    const expr = modifier !== 0 ? `1d20${modifier > 0 ? '+' : ''}${modifier}` : '1d20'
    const res = await fetch(`/api/campaigns/${campaign.id}/rolls`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expression: expr, attribute: label }),
    }).catch(() => null)
    if (!res?.ok) return
    const roll: RollLogEntry = await res.json().catch(() => null)
    if (!roll) return
    sinceRef.current = roll.rolledAt
    setLastRollId(roll.id)
    setRolls(prev => [roll, ...prev].slice(0, 50))
    setTimeout(() => setLastRollId(null), 2000)
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
    <div className="mesa-dark fixed inset-0 z-50 flex flex-col" style={{background:'var(--mesa-table)'}}>

      {/* Brilho ambiente de cripta (brasa + ouro) — atmosfera do template */}
      <div className="pointer-events-none absolute inset-0 z-0" style={{background:'radial-gradient(ellipse 60% 40% at 50% 0%, rgb(var(--ember) / 0.12), transparent 60%), radial-gradient(ellipse at 100% 100%, rgba(201,162,42,0.06), transparent 55%)'}} />

      {/* ── Top bar ── */}
      <div className="h-11 flex items-center justify-between px-3 sm:px-4 shrink-0 border-b border-gold/15 relative z-10 bg-bg/85 backdrop-blur-sm">

        {/* Left */}
        <div className="flex items-center gap-2 sm:gap-5 min-w-0">
          <Link href={`/campaign/${campaign.id}`}
                className="flex items-center gap-1.5 sm:gap-2 text-saga-muted hover:text-gold transition-colors group shrink-0">
            <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L4.862 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd"/>
            </svg>
            <span className="font-cinzel text-[13px] font-semibold text-gold/90 group-hover:text-gold truncate max-w-[100px] sm:max-w-none">{campaign.name}</span>
          </Link>
          <div className="hidden sm:block h-4 w-px bg-ink/10"/>
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
              className="w-6 h-6 rounded text-xs font-bold text-saga-muted hover:text-saga-text hover:bg-ink/8 transition-all flex items-center justify-center">−</button>
            <span className="text-[11px] text-saga-dim w-10 text-center font-mono">{Math.round(zoom*100)}%</span>
            <button onClick={()=>setZoom(z=>Math.min(4,+(z*1.18).toFixed(2)))}
              className="w-6 h-6 rounded text-xs font-bold text-saga-muted hover:text-saga-text hover:bg-ink/8 transition-all flex items-center justify-center">+</button>
          </div>
          <button onClick={()=>{setPan({x:80,y:60});setZoom(1)}}
            className="hidden sm:block px-2 h-6 rounded text-[10px] text-saga-dim hover:text-saga-text hover:bg-ink/8 transition-all">
            Reset
          </button>
          <div className="hidden sm:block h-4 w-px bg-ink/10"/>

          {/* Mapa button */}
          {isGM && <div data-mesa-tutorial="topbar-map" className="relative" ref={mapDropRef}>
            <button onClick={()=>setMapInputOpen(o=>!o)}
              className={`px-2 sm:px-3 h-7 rounded text-[11px] font-medium border transition-all flex items-center gap-1.5 ${
                mapUrl?'text-gold border-gold/50 bg-gold/10':'text-saga-muted border-ink/10 hover:border-gold/40 hover:text-gold'
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
                    className="w-full px-3 py-2 rounded text-[12px] text-saga-text placeholder:text-saga-dim focus:outline-none bg-bg/50 border border-ink/10 focus:border-gold/60 transition-colors"
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
              sheetsOpen?'text-gold border-gold/50 bg-gold/10':'text-saga-muted border-ink/10 hover:border-gold/40 hover:text-gold'
            }`}>
            <ClipboardList size={13}/>
            <span className="hidden sm:inline">Fichas</span>
          </button>
          {activeSession?.isActive && (
            <button data-mesa-tutorial="topbar-initiative" onClick={()=>setInitiativeOpen(o=>!o)}
              title="Tracker de Iniciativa"
              className={`px-2 sm:px-3 h-7 rounded text-[11px] font-medium border transition-all flex items-center gap-1.5 ${
                initiativeOpen?'text-gold border-gold/50 bg-gold/10':'text-saga-muted border-ink/10 hover:border-gold/40 hover:text-gold'
              }`}>
              <Swords size={13}/>
              <span className="hidden sm:inline">Iniciativa</span>
            </button>
          )}
          {activeSession?.isActive && (
            <button onClick={()=>setHandoutsOpen(o=>!o)}
              title="Handouts"
              className={`px-2 sm:px-3 h-7 rounded text-[11px] font-medium border transition-all flex items-center gap-1.5 ${
                handoutsOpen?'text-gold border-gold/50 bg-gold/10':'text-saga-muted border-ink/10 hover:border-gold/40 hover:text-gold'
              }`}>
              <BookOpen size={13}/>
              <span className="hidden sm:inline">Handouts</span>
            </button>
          )}
          {isGM && (
            <button data-mesa-tutorial="topbar-music" onClick={()=>setMusicOpen(true)}
              className="px-2 sm:px-3 h-7 rounded text-[11px] font-medium border transition-all text-saga-muted border-ink/10 hover:border-gold/40 hover:text-gold flex items-center gap-1.5">
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
                    : 'text-saga-muted border-ink/10 hover:border-emerald-400/40 hover:text-emerald-400'
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
                <LiveControlPanel
                  campaignId={campaign.id}
                  members={members}
                  liveMembers={liveMembers}
                  setLiveMembers={setLiveMembers}
                  expandedLiveMember={expandedLiveMember}
                  setExpandedLiveMember={setExpandedLiveMember}
                  tokens={tokens}
                  setTokens={setTokens}
                  syncTokens={syncTokens}
                  onClose={()=>setLiveOpen(false)}
                />
              )}
            </div>
          )}
          {/* Chat toggle — mobile only */}
          <button onClick={()=>setChatOpen(o=>!o)}
            className={`sm:hidden px-2 h-7 rounded border transition-all flex items-center ${
              chatOpen?'text-gold border-gold/50 bg-gold/10':'text-saga-muted border-ink/10'
            }`}>
            <MessageSquare size={13}/>
          </button>
          <button
            onClick={() => window.dispatchEvent(new Event('saga:mesa-tutorial'))}
            title="Ver tutorial da Mesa Virtual"
            className="w-7 h-7 rounded-full flex items-center justify-center text-saga-dim hover:text-gold transition-colors hover:bg-ink/6"
          >
            <HelpCircle size={13}/>
          </button>
          {isGM&&activeSession?.isActive&&<EndSessionButton campaignId={campaign.id} compact/>}
        </div>
      </div>

      {/* ── Main ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* ── Left toolbar ── */}
        <div data-mesa-tutorial="toolbar" className="w-12 flex flex-col items-center py-2 gap-0.5 shrink-0 border-r border-ink/5 z-10 bg-bg/[0.92]">
          {tools.map(([t,Icon,label])=>(
            <button key={t}
              onClick={()=>{setTool(t);setAddToken(null);if(t!=='measure')setMeasureAnchor(null)}}
              title={label}
              className={`w-8 h-8 rounded flex items-center justify-center transition-all relative group
                ${tool===t?'bg-gold/20 text-gold ring-1 ring-gold/40':'text-saga-dim hover:text-saga-text hover:bg-ink/6'}`}>
              <Icon size={15}/>
              <span className="absolute left-full ml-2 px-2 py-1 rounded bg-surface border border-border text-[10px] text-saga-text whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg hidden sm:block">
                {label}
              </span>
            </button>
          ))}
          <div className="w-5 h-px bg-ink/8 my-1"/>
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
            backgroundImage:`linear-gradient(rgba(201,162,42,0.10) 1px,transparent 1px),linear-gradient(90deg,rgba(201,162,42,0.10) 1px,transparent 1px)`,
            backgroundSize:`${GRID*zoom}px ${GRID*zoom}px`,
            backgroundPosition:`${pan.x%(GRID*zoom)}px ${pan.y%(GRID*zoom)}px`,
            backgroundColor:'rgb(var(--mesa-bg))',
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
          {/* Vinheta de candelabro */}
          <div
            className="animate-flicker pointer-events-none absolute inset-0"
            style={{background:'radial-gradient(ellipse at 50% 45%, transparent 40%, rgba(0,0,0,0.55) 100%)'}}
          />

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
              const canMoveToken = isGM || (liveMembers.includes(currentMemberId) && (t.id === currentMemberId || (t.allowedPlayers?.includes(currentMemberId) ?? false)))
              return (
                <div key={t.id}
                  data-token-id={t.id}
                  className="absolute flex flex-col items-center gap-1 select-none"
                  style={{left:t.x,top:t.y,transform:'translate(-50%,-50%)',
                    cursor:tool==='select'?(isDragging?'grabbing':canMoveToken?'grab':'default'):'default',
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
                      <Play className="h-1.5 w-1.5 fill-yellow-900 text-yellow-900" />
                    </div>}
                  </div>
                  <span className="font-cormorant text-[10px] font-medium px-1.5 py-0.5 rounded-sm whitespace-nowrap max-w-[80px] truncate bg-black/70 backdrop-blur-sm border"
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
                style={{left:rect.x,top:rect.y,width:rect.w,height:rect.h,background:'rgba(0,0,0,0.88)',border:'1px solid rgb(var(--ink) / 0.04)'}}/>
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
              systemCategory={systemCategory}
              canRoll={!!activeSession?.isActive}
              onRollAttribute={rollAttribute}
              hpOverrides={hpOverrides}
              onHpChange={(id, hp) => setHpOverrides(prev => ({ ...prev, [id]: hp }))}
            />
          )}

          {/* ── Initiative Tracker ── */}
          {initiativeOpen&&(
            <InitiativeTracker
              initiativeOrder={initiativeOrder}
              currentTurnIdx={currentTurnIdx}
              isGM={isGM}
              onRollInitiative={rollInitiative}
              onNextTurn={nextTurn}
              onClose={()=>setInitiativeOpen(false)}
            />
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
            <AddTokenPopover
              addToken={addToken}
              canvasRef={canvasRef}
              isGM={isGM}
              npcs={npcs}
              onPlaceNpc={placeNpcToken}
              gmCustomOpen={gmCustomOpen}
              setGmCustomOpen={setGmCustomOpen}
              newTokenLabel={newTokenLabel}
              setNewTokenLabel={setNewTokenLabel}
              newTokenType={newTokenType}
              setNewTokenType={setNewTokenType}
              newTokenColor={newTokenColor}
              setNewTokenColor={setNewTokenColor}
              onAddNewToken={addNewToken}
              onClose={()=>{setAddToken(null);setGmCustomOpen(false)}}
              onCancel={()=>setAddToken(null)}
            />
          )}
        </div>

        {/* ── Chat panel ── */}
        {chatOpen&&<div className="sm:hidden fixed inset-0 bg-black/50 z-40" onClick={()=>setChatOpen(false)}/>}
        <div className={`
          absolute sm:relative inset-y-0 right-0 z-50 sm:z-auto
          w-[300px] flex flex-col shrink-0 border-l border-ink/5
          bg-bg transition-transform duration-300
          ${chatOpen?'translate-x-0':'-translate-x-0 sm:translate-x-0'}
          hidden sm:flex ${chatOpen?'!flex':''}
        `}>

          <RollLog
            rolls={rolls}
            lastRollId={lastRollId}
            activeSessionIsActive={!!activeSession?.isActive}
            membersCount={members.length}
            onCloseMobile={()=>setChatOpen(false)}
            chatEndRef={chatEndRef}
          />

          <DiceBar
            chatInput={chatInput}
            setChatInput={setChatInput}
            onSendChat={()=>void sendChatMessage()}
            sendingChat={sendingChat}
            activeSessionIsActive={!!activeSession?.isActive}
            rollModifier={rollModifier}
            setRollModifier={setRollModifier}
            rollingDie={rollingDie}
            onRollDie={(die)=>void rollDie(die)}
          />
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
