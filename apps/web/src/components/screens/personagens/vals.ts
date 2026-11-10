'use client'

import { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { dcHref } from '@/lib/dc-routes'

/** Dados reais de /personagens (app/(app)/personagens/page.tsx). */
export type PersonagensDados = {
  chars: {
    id: string; n: string; sub: string; camp: string; sys: string; lv: string; hp: number; mx: number; hpLabel: string
    res: [string, number, number] | null; img: string | null
    regra: 'pool' | 'pct' | 'd20'
    attrs: [string, number][]
  }[]
  /** NPCs das campanhas em que você é o mestre. */
  grupos: { campaignId: string; n: string; npcs: { id: string; n: string; type: string; d: string; vis: boolean; img: string | null }[] }[]
  aba: 'jogador' | 'npc'
}

const COVERS = ['linear-gradient(135deg,#0b0c11,#6a2817)', 'linear-gradient(135deg,#0e1a1c,#3a5a5a)', 'linear-gradient(135deg,#2a1c08,#c9a22a)', 'linear-gradient(135deg,#1a0c04,#d9662b)', 'linear-gradient(135deg,#1e1a14,#6a5a3a)']
const NPC_COV = ['linear-gradient(135deg,#2a1c08,#8f3a24)', 'linear-gradient(135deg,#1a120c,#5c4410)', 'linear-gradient(135deg,#1a0c04,#6a2817)', 'linear-gradient(135deg,#1e1a14,#6a5a3a)']
const T_COL: Record<string, string> = { 'Vilão': '#8a1c24', 'Aliado': '#4f7a3a', 'Mercador': '#b98a2a', 'Familiar': '#6b5a8a', 'Neutro': '#76695a' }
const bar = (p: number) => (p > 50 ? 'var(--ok)' : p > 25 ? 'var(--gold)' : 'var(--accent)')
const mod = (v: number) => Math.floor((v - 10) / 2)

type Roll = { label: string; detail: string; total: number | string; color: string }

export function usePersonagensVals(d: PersonagensDados) {
  const [tab, setTab] = useState(d.aba)
  const [sel, setSel] = useState(0)
  const [hp, setHp] = useState<Record<string, number>>(() => Object.fromEntries(d.chars.map(c => [c.id, c.hp])))
  const [hpTick, setHpTick] = useState(0)
  const [roll, setRoll] = useState<Roll | null>(null)
  const [rolling, setRolling] = useState(false)
  const [type, setType] = useState('Todos')
  const [vis, setVis] = useState<Record<string, boolean>>({})
  const [flip, setFlip] = useState<Record<string, number>>({})
  const tr = useRef<ReturnType<typeof setTimeout>>()
  const save = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => () => { clearTimeout(tr.current); clearTimeout(save.current) }, [])
  const isP = tab === 'jogador'

  const cs = d.chars.map((c, i) => {
    const h = hp[c.id] ?? c.hp, p = c.mx > 0 ? Math.round(h / c.mx * 100) : 0
    return { ...c, cover: COVERS[i % COVERS.length], slot: `pers-retrato-${c.id}`, hpText: `${h} / ${c.mx}`, pct: p, bar: bar(p), delay: (i * 0.06).toFixed(2), ring: sel === i ? '0 0 0 2px var(--accent), 0 16px 30px -20px rgb(60 30 10/.6)' : '0 10px 24px -20px rgb(60 30 10/.5)', go: () => { setSel(i); setRoll(null) } }
  })
  const c = cs[sel]

  const rollAttr = (k: string, v: number) => {
    if (rolling || !c) return
    let rolls: number[], total: number, detail: string
    if (c.regra === 'pool') { rolls = Array.from({ length: v + 2 }, () => 1 + Math.floor(Math.random() * 10)); total = rolls.filter(x => x >= 6).length; detail = `${v + 2}d10 dif. 6 · [${rolls.join(', ')}]` }
    else if (c.regra === 'pct') { const r = 1 + Math.floor(Math.random() * 100); rolls = [r]; total = r; detail = `1d100 ≤ ${v} · ${r <= v / 5 ? 'extremo' : r <= v / 2 ? 'difícil' : r <= v ? 'sucesso' : 'falha'}` }
    else { const r = 1 + Math.floor(Math.random() * 20), m = mod(v); rolls = [r]; total = r + m; detail = `1d20${m >= 0 ? '+' : ''}${m} · [${r}]` }
    const good = c.regra === 'pool' ? total > 0 : c.regra === 'pct' ? rolls[0] <= v : rolls[0] === 20
    const first = c.n.split(' ')[0]
    setRolling(true); setRoll({ label: `${first} · ${k}`, detail: 'rolando…', total: '…', color: '#cdbb98' })
    clearTimeout(tr.current)
    tr.current = setTimeout(() => { setRolling(false); setRoll({ label: `${first} · ${k}${c.regra === 'pool' ? ' (sucessos)' : ''}`, detail, total, color: good ? '#f3dc94' : '#e8a080' }) }, 700)
  }

  const hpSet = (delta: number) => {
    if (!c) return
    const v = Math.max(0, Math.min(c.mx, (hp[c.id] ?? c.hp) + delta))
    setHp(h => ({ ...h, [c.id]: v })); setHpTick(n => n + 1)
    clearTimeout(save.current)
    const id = c.id
    save.current = setTimeout(() => {
      void fetch(`/api/characters/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hp: v }) }).catch(() => null)
    }, 500)
  }

  let k = 0, total = 0
  const counts: Record<string, number> = {}
  const groups = d.grupos.map((g, gi) => {
    const npcs = g.npcs.map((npc, j) => {
      const visible = vis[npc.id] ?? npc.vis
      counts[npc.type] = (counts[npc.type] ?? 0) + 1; total++
      return {
        ...npc, visible, slot: `npc-${npc.id}`, cover: NPC_COV[(gi + j) % 4], tBg: T_COL[npc.type] ?? T_COL['Neutro'], hidden: !visible, delay: ((k++) * 0.04).toFixed(2),
        vLabel: visible ? 'Visível aos jogadores' : 'Restrito ao mestre', vIcon: visible ? Eye : EyeOff,
        vBg: visible ? 'color-mix(in oklab, var(--ok) 15%, transparent)' : 'var(--surface2)', vColor: visible ? 'var(--ok)' : 'var(--muted)',
        vAnim: flip[npc.id] ? 'personagens-pop .35s' : 'none',
        toggle: () => {
          setVis(x => ({ ...x, [npc.id]: !visible })); setFlip(x => ({ ...x, [npc.id]: (x[npc.id] ?? 0) + 1 }))
          void fetch(`/api/campaigns/${g.campaignId}/npcs/${npc.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isPublic: !visible }) }).catch(() => null)
        },
      }
    }).filter(p => type === 'Todos' || p.type === type)
    return { n: g.n, meta: `${g.npcs.length} NPCs`, href: `/campaign/${g.campaignId}?aba=npcs`, npcs }
  }).filter(g => g.npcs.length)

  const imgs: Record<string, string | null> = {}
  d.chars.forEach(x => { imgs[`pers-retrato-${x.id}`] = x.img })
  d.grupos.forEach(g => g.npcs.forEach(n => { imgs[`npc-${n.id}`] = n.img }))

  const mudar = (t: 'jogador' | 'npc') => { setTab(t); window.history.replaceState(null, '', t === 'npc' ? '?aba=npc' : '/personagens') }
  return {
    $href: (link: string) => dcHref(link, { characterId: c?.id }),
    $img: (id: string) => imgs[id] ?? null,
    isPlayer: isP, isNpc: !isP, createLabel: isP ? 'Criar personagem' : 'Criar NPC', createHref: isP ? '/personagens/novo' : '/personagens/novo?modo=npc',
    toPlayer: () => mudar('jogador'), toNpc: () => mudar('npc'),
    sliderX: isP ? '0%' : '100%', sliderBg: isP ? 'linear-gradient(160deg,#b8492a,#7a2a14)' : 'linear-gradient(160deg,#3a2a1c,#1a120c)',
    pColor: isP ? '#fff8f0' : 'var(--muted)', nColor: !isP ? '#f1e3c2' : 'var(--muted)',
    pIconBg: isP ? 'rgb(255 240 220/.16)' : 'var(--surface)', nIconBg: !isP ? 'rgb(255 240 220/.12)' : 'var(--surface)',
    nChars: d.chars.length, nNpcs: total, chars: cs, temSel: !!c,
    sel: c ? {
      ...c,
      attrs: c.attrs.map(([kk, v]) => ({ k: kk, v, m: c.regra === 'pool' ? `${v + 2}d10` : c.regra === 'pct' ? `${v}%` : `${mod(v) >= 0 ? '+' : ''}${mod(v)}`, go: () => rollAttr(kk, v) })),
      hasRes: !!c.res, resLabel: c.res?.[0] ?? '', resText: c.res ? `${c.res[1]} / ${c.res[2]}` : '', resPct: c.res && c.res[2] > 0 ? Math.round(c.res[1] / c.res[2] * 100) : 0,
    } : null!,
    hpDown: () => hpSet(-1), hpUp: () => hpSet(1), hpAnim: hpTick ? `personagens-pop .3s ${hpTick % 2 ? 'ease' : 'ease-out'}` : 'none',
    hasRoll: !!roll, roll: roll ?? { label: '', detail: '', total: '', color: '' }, rollAnim: rolling ? 'personagens-spin .7s cubic-bezier(.2,.7,.3,1) both' : 'none',
    types: ['Todos', 'Vilão', 'Aliado', 'Mercador', 'Familiar', 'Neutro'].map(l => ({
      l, n: l === 'Todos' ? total : counts[l] ?? 0, dot: T_COL[l] ?? 'var(--ink)', go: () => setType(l),
      bg: type === l ? 'var(--ink)' : 'var(--surface)', color: type === l ? 'var(--bg)' : 'var(--ink)', ring: type === l ? 'var(--ink)' : 'var(--line)',
    })),
    groups,
  }
}

export type Vals = ReturnType<typeof usePersonagensVals>
