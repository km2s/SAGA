'use client'

import { useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { Dices, Map as MapIcon, MessagesSquare, ScrollText, Swords, type LucideIcon } from 'lucide-react'
import { dcHref } from '@/lib/dc-routes'
import { toggleTema } from '@/lib/tema'
import type { Vals as MesaVals } from '@/components/screens/mesa/vals'

/**
 * SAGA Mesa Celular (abaixo de 760 px). Usa a mesma lógica da Mesa de desktop
 * (tokens, iniciativa, ficha, chat e rolagens no servidor); aqui só a
 * navegação do celular: aba, token tocado, zoom, arrastar e pinça.
 */
export function useMesaCelularVals(m: MesaVals) {
  const [tab, setTab] = useState('map')
  const [sel, setSel] = useState<string | null>(null)
  const [zoom, setZoom] = useState(.8)
  const [pan, setPan] = useState({ x: 16, y: 16 })
  const [die, setDie] = useState(20)
  const toques = useRef(new Map<number, { x: number; y: number }>())
  const gesto = useRef<{ x: number; y: number; px: number; py: number; dist: number; zoom: number; moveu: boolean } | null>(null)

  const open = tab !== 'map'
  const selT = m.tokens.find(t => t.id === sel)
  const tabBtn = (k: string, l: string, icon: LucideIcon) => ({
    l, icon, on: tab === k, go: () => setTab(tab === k && k !== 'map' ? 'map' : k),
    color: tab === k ? 'var(--accent)' : 'var(--muted)', line: tab === k ? 'inset 0 2px 0 var(--accent)' : 'none',
  })
  const dist = () => { const p = [...toques.current.values()]; return p.length < 2 ? 0 : Math.hypot(p[0]!.x - p[1]!.x, p[0]!.y - p[1]!.y) }
  const rl = m.roll
  const ini = m.ini
  return {
    $href: (link: string) => dcHref(link, { campaignId: m.campanhaId }),
    toggleTema, voltarHref: m.voltarHref, campanha: m.campanha,
    subLinha: m.mLiveOn ? `${m.sessaoNome ?? 'Sessão'} ao vivo${ini.length ? ` · rodada ${m.round}` : ''}` : 'Sem sessão ao vivo',
    // Mapa: arrastar com um dedo, pinça com dois (toque num token seleciona).
    zoom, mapTop: '0', panX: pan.x, panY: pan.y, boardW: m.boardW, boardH: m.boardH, terrain: m.terrain, mapa: m.mapa,
    zin: () => setZoom(z => Math.min(1.6, +(z + .2).toFixed(2))), zout: () => setZoom(z => Math.max(.4, +(z - .2).toFixed(2))),
    mapDown: (e: RPointerEvent) => {
      toques.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      gesto.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, dist: dist(), zoom, moveu: false }
    },
    mapMove: (e: RPointerEvent) => {
      if (!toques.current.has(e.pointerId) || !gesto.current) return
      toques.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const g = gesto.current
      if (toques.current.size >= 2 && g.dist > 0) { setZoom(Math.max(.4, Math.min(1.6, +(g.zoom * dist() / g.dist).toFixed(2)))); g.moveu = true; return }
      const dx = e.clientX - g.x, dy = e.clientY - g.y
      if (Math.abs(dx) + Math.abs(dy) > 4) g.moveu = true
      setPan({ x: g.px + dx, y: g.py + dy })
    },
    mapUp: (e: RPointerEvent) => { toques.current.delete(e.pointerId); if (toques.current.size === 0) gesto.current = null },
    toks: m.tokens.filter(t => t.op !== 0).map(t => ({
      n: t.label, i: t.i, c: t.c, x: t.left - 2, y: t.top - 2, pct: t.pct, hpC: t.hpC,
      ring: sel === t.id ? '0 0 0 3px #f3dc94' : '0 4px 10px -2px rgb(0 0 0/.6)',
      go: () => { if (!gesto.current?.moveu) setSel(t.id) },
    })),
    hasSel: !!selT && !open,
    sel: selT ? {
      n: selT.label, i: selT.i, c: selT.c,
      linha: [m.podeVerVida(selT) ? `${selT.hp}/${selT.maxHp} PV` : null, selT.ca != null ? `CA ${selT.ca}` : null].filter(Boolean).join(' · ') || (selT.type === 'enemy' ? 'Inimigo' : selT.type === 'npc' ? 'NPC' : 'Jogador'),
    } : { n: '', i: '', c: '', linha: '' },
    selBottom: '12px', clearSel: () => setSel(null),
    selAtk: () => { if (selT) { setTab('dados'); m.atacarToken(selT.id) } },
    sheetOpen: open, closeSheet: () => setTab('map'),
    sheetTitle: ({ ini: `Iniciativa · rodada ${m.round}`, ficha: m.fs.n || 'Ficha', chat: 'Chat da sessão', dados: 'Dados' } as Record<string, string>)[tab] ?? '',
    tIni: tab === 'ini', tFicha: tab === 'ficha', tChat: tab === 'chat', tDados: tab === 'dados',
    ini: ini.map(r => ({ v: r.v, i: r.i, c: r.c, n: r.label, now: r.fw === 600 ? 'vez dele' : '', bg: r.fw === 600 ? 'var(--accent-t)' : 'transparent' })),
    attrs: m.sheet.attrs.map(a => ({ k: a.k, m: a.m, go: () => { setTab('dados'); a.go() } })),
    fichaHref: m.fs.href,
    chat: m.log.map(l => ({ w: l.who, t: l.isMsg ? l.t : '', x: l.isMsg ? l.text : `${l.whatS}${l.showTotal ? ` · ${l.total}` : ''}` })),
    chatIn: m.chatIn, onChatIn: m.onChatIn, chatKey: m.chatKey, chatSend: m.chatSend, chatOff: m.chatOff,
    dice: [4, 6, 8, 10, 12, 20, 100].map(dd => ({
      l: `d${dd}`, go: () => { setDie(dd); m.dice.find(x => x.die === `d${dd}`)?.go() },
      bg: die === dd ? 'var(--ink)' : 'var(--surface)', color: die === dd ? 'var(--bg)' : 'var(--ink)',
    })),
    dieL: `1d${die}`, rollNow: m.rollNow,
    hasRes: m.showRoll && (rl.openDone || rl.sealedDone), res: rl.sealedDone ? 'Selado' : rl.openDone ? rl.total : '', resC: rl.crit ? 'var(--gold)' : 'var(--ink)',
    tabs: [tabBtn('map', 'Mapa', MapIcon), tabBtn('ini', 'Iniciativa', Swords), tabBtn('ficha', 'Ficha', ScrollText), tabBtn('chat', 'Chat', MessagesSquare), tabBtn('dados', 'Dados', Dices)],
  }
}

export type Vals = ReturnType<typeof useMesaCelularVals>
