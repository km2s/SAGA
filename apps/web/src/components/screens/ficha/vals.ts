'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Award, Backpack, NotebookPen, ScrollText, WandSparkles, type LucideIcon } from 'lucide-react'
import { dcHref } from '@/lib/dc-routes'

/**
 * Porte do renderVals() de SAGA Ficha.dc.html (ficha de D&D 5e) com os dados
 * reais da ficha. Magias, inventário, moedas, XP, traços e recursos de classe
 * ainda não têm tabela: as listas ficam vazias (TODO(api), docs/api-pendente.md).
 */
export type FichaDados = {
  id: string; memberId: string; campaignId: string; podeEditar: boolean
  nome: string; linha: string; sysCamp: string; img: string | null
  classe: string | null; nivel: number; hp: number; mx: number
  attrs: { n: string; k: string; v: number }[]
  saves: Record<string, number | null>
  skills: { n: string; a: string; b: number | null }[]
  ca: number | null; desloc: string | null; percPassiva: number | null
  armas: { n: string; d: string; b: number; dano: string }[]
  slots: { level: number; total: number; used: number }[]
  textos: { diario: string; juramentos: string }
}

type Toast = { id: number; label: string; detail: string; total: number | string; color: string; ring: string; tag: string; tagColor: string }
// Dado de vida por classe (Livro do Jogador).
const HD: Record<string, number> = { 'Bárbaro': 12, 'Guerreiro': 10, 'Paladino': 10, 'Patrulheiro': 10, 'Bardo': 8, 'Bruxo': 8, 'Clérigo': 8, 'Druida': 8, 'Ladino': 8, 'Monge': 8, 'Feiticeiro': 6, 'Mago': 6 }
const sg = (v: number) => (v >= 0 ? '+' : '') + v
const mod = (v: number) => Math.floor((v - 10) / 2)
const json = (url: string, method: string, body: unknown) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null)

/** "1d8+3" → [1, 8, 3]; sem dado reconhecível → null. */
function parseDano(s: string): [number, number, number] | null {
  const m = s.replace(/\s/g, '').match(/^(\d*)d(\d+)([+-]\d+)?/i)
  return m ? [Math.max(1, +(m[1] || 1)), +m[2], m[3] ? +m[3] : 0] : null
}

export function useFichaVals(d: FichaDados) {
  const [tab, setTab] = useState('main')
  const [hp, setHpS] = useState(d.hp)
  const [tmp, setTmp] = useState(0) // TODO(api): PV temporários
  const [amt, setAmt] = useState(5)
  const [hpTick, setHpTick] = useState(0)
  const [hpKind, setHpKind] = useState<'hit' | 'heal'>('hit')
  const [hdLeft, setHdLeft] = useState(d.nivel) // TODO(api): dados de vida gastos
  const [insp, setInsp] = useState(false) // TODO(api): inspiração
  const [inspTick, setInspTick] = useState(0)
  const [smite, setSmite] = useState(false)
  const [slots, setSlots] = useState(d.slots)
  const [ds, setDs] = useState({ ok: 0, fail: 0 })
  const [loh, setLoh] = useState(d.nivel * 5) // TODO(api): reserva gasta
  const [toasts, setToasts] = useState<Toast[]>([])
  const [diary, setDiary] = useState(d.textos.diario)
  const [oaths, setOaths] = useState(d.textos.juramentos)
  const tt = useRef<ReturnType<typeof setTimeout>[]>([])
  const saveHp = useRef<ReturnType<typeof setTimeout>>()
  const saveTxt = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  useEffect(() => () => { tt.current.forEach(clearTimeout); clearTimeout(saveHp.current); Object.values(saveTxt.current).forEach(clearTimeout) }, [])

  const api = `/api/characters/${d.id}`
  const M = Object.fromEntries(d.attrs.map(a => [a.k, mod(a.v)])) as Record<string, number>
  const PB = 2 + Math.floor((d.nivel - 1) / 4)
  const hd = HD[d.classe ?? ''] ?? 8
  const isPaladino = d.classe === 'Paladino'
  const lohMax = d.nivel * 5

  const toast = (x: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random()
    setToasts(ts => [...ts, { id, ...x }].slice(-4))
    tt.current.push(setTimeout(() => setToasts(ts => ts.filter(y => y.id !== id)), 4800))
  }
  const roll = (label: string, n: number, dd: number, m = 0, o: { dis?: boolean; extra?: [number, number][]; tag?: string } = {}) => {
    const r = () => 1 + Math.floor(Math.random() * dd)
    let rolls = Array.from({ length: n }, r), kept = rolls, note = ''
    if (o.dis && n === 1 && dd === 20) { rolls = [r(), r()]; kept = [Math.min(...rolls)]; note = ' desv.' }
    const extra = o.extra ?? [], ex = extra.map(([en, ed]) => Array.from({ length: en }, () => 1 + Math.floor(Math.random() * ed)))
    const total = kept.reduce((a, b) => a + b, 0) + m + ex.flat().reduce((a, b) => a + b, 0)
    const nat = dd === 20 && n === 1 ? kept[0] : null, ms = m ? (m > 0 ? `+${m}` : `${m}`) : ''
    const detail = `${n}d${dd}${ms}${extra.map(([en, ed]) => ` + ${en}d${ed}`).join('')}${note} · [${[rolls, ...ex].map(a => a.join(', ')).join(' | ')}]`
    toast({ label, detail, total, color: nat === 20 ? '#f3dc94' : nat === 1 ? '#e8a080' : '#f1e3c2', ring: nat === 20 ? '#c9a22a' : 'rgb(201 162 42/.3)', tag: nat === 20 ? 'Crítico!' : nat === 1 ? 'Falha crítica' : (o.tag ?? ''), tagColor: nat === 20 ? '#f3dc94' : nat === 1 ? '#e8a080' : '#8fbf6a' })
    return { total, nat }
  }
  const setHp = (v: number, kind: 'hit' | 'heal') => {
    const nv = Math.max(0, Math.min(d.mx, v))
    setHpS(nv); setHpTick(n => n + 1); setHpKind(kind)
    if (nv > 0) setDs({ ok: 0, fail: 0 })
    if (!d.podeEditar) return
    clearTimeout(saveHp.current)
    saveHp.current = setTimeout(() => { void json(api, 'PATCH', { hp: nv }) }, 500)
  }
  const salvarTexto = (key: 'diario' | 'juramentos', label: string, value: string) => {
    if (!d.podeEditar) return
    clearTimeout(saveTxt.current[key])
    saveTxt.current[key] = setTimeout(() => { void json(`${api}/text-fields`, 'POST', { key, label, value }) }, 800)
  }
  const salvarSlot = (level: number, used: number) => { if (d.podeEditar) void json(`${api}/spell-slots`, 'PATCH', { level, used }) }

  // Espaços do primeiro círculo com espaços (Destruição Divina e magias gastam deste).
  const slot = slots.find(x => x.total > 0) ?? null
  const slotsLeft = slot ? slot.total - slot.used : 0
  const usar = (delta: number) => {
    if (!slot) return
    const used = Math.max(0, Math.min(slot.total, slot.used + delta))
    setSlots(xs => xs.map(x => (x.level === slot.level ? { ...x, used } : x))); salvarSlot(slot.level, used)
  }
  const spendSlot = () => { if (!slot || slot.used >= slot.total) return false; usar(1); return true }

  const pip = (on: boolean, go: () => void, t: string, col = 'var(--accent)') => ({ bg: on ? col : 'transparent', ring: col, go, t, anim: 'none' })
  const hpPct = d.mx > 0 ? Math.round(hp / d.mx * 100) : 0
  const tmpPct = d.mx > 0 ? Math.min(100 - hpPct, Math.round(tmp / d.mx * 100)) : 0
  const forca = d.attrs.find(a => a.k === 'FOR')?.v ?? 10
  const dex = M.DES ?? 0
  const intuicao = d.skills.find(s => s.n === 'Intuição')?.b
  const tabs: [string, string, LucideIcon][] = [['main', 'Principal', ScrollText], ['spells', 'Magias', WandSparkles], ['inv', 'Inventário', Backpack], ['feat', 'Traços', Award], ['notes', 'Notas', NotebookPen]]

  return {
    // Id da ficha: /ficha/[id] usa ele e /personagens/[id] aceita os dois.
    $href: (link: string) => dcHref(link, { campaignId: d.campaignId, characterId: d.id }),
    $img: (_id: string) => d.img,
    init: (d.nome[0] ?? '?').toUpperCase(), nome: d.nome, linha: d.linha, sysCamp: d.sysCamp,
    temXp: false, xp: '', xpPct: 0, // TODO(api): experiência
    ini: sg(dex),
    toggleInsp: () => { setInsp(!insp); setInspTick(n => n + 1) },
    inspBg: insp ? 'var(--gold-t)' : 'var(--surface)', inspRing: insp ? 'var(--gold)' : 'var(--line)', inspDot: insp ? 'var(--gold)' : 'var(--line)',
    inspColor: insp ? 'color-mix(in oklab, var(--gold) 60%, var(--ink))' : 'var(--muted)', inspAnim: inspTick ? `${inspTick % 2 ? 'ficha-popA' : 'ficha-popB'} .35s` : 'none',
    rollInit: () => roll('Iniciativa', 1, 20, dex, { tag: 'Iniciativa' }),
    shortRest: () => {
      if (!hdLeft) return toast({ label: 'Descanso curto', detail: 'Sem dados de vida', total: '—', color: '#e8a080', ring: '#a8262f', tag: '', tagColor: '#fff' })
      const r = roll('Descanso curto · 1 dado de vida', 1, hd, M.CON ?? 0, { tag: 'Cura' })
      setHdLeft(hdLeft - 1); setHp(hp + r.total, 'heal')
    },
    longRest: () => {
      setTmp(0); setHdLeft(Math.min(d.nivel, hdLeft + Math.max(1, Math.floor(d.nivel / 2)))); setLoh(lohMax); setDs({ ok: 0, fail: 0 })
      slots.forEach(x => { if (x.used) salvarSlot(x.level, 0) })
      setSlots(slots.map(x => ({ ...x, used: 0 })))
      setHp(d.mx, 'heal')
      toast({ label: 'Descanso longo', detail: 'PV, espaços e recursos restaurados', total: '☾', color: '#f3dc94', ring: '#c9a22a', tag: 'Restaurado', tagColor: '#8fbf6a' })
    },
    tabs: tabs.map(([k, l, icon]) => ({ l, icon, go: () => setTab(k), color: tab === k ? 'var(--ink)' : 'var(--muted)', line: tab === k ? 'inset 0 -2px 0 var(--accent)' : 'none' })),
    tMain: tab === 'main', tSpells: tab === 'spells', tInv: tab === 'inv', tFeat: tab === 'feat', tNotes: tab === 'notes',
    attrs: d.attrs.map(a => {
      const sv = d.saves[a.k] ?? M[a.k]
      return { n: a.n, v: a.v, m: sg(M[a.k]), sv: sg(sv), svDot: sv > M[a.k] ? 'var(--accent)' : 'transparent', check: () => roll(`Teste de ${a.n}`, 1, 20, M[a.k]), save: () => roll(`Salvaguarda de ${a.n}`, 1, 20, sv, { tag: 'Salvaguarda' }) }
    }),
    ca: d.ca ?? 10 + dex, caAnim: 'none',
    stats: [{ v: d.desloc ?? '—', l: 'Deslocamento' }, { v: sg(PB), l: 'Proficiência' }, { v: String(d.percPassiva ?? 10 + (M.SAB ?? 0)), l: 'Percepção passiva' }],
    passivas: `Percepção passiva ${d.percPassiva ?? 10 + (M.SAB ?? 0)} · Intuição passiva ${10 + (intuicao ?? M.SAB ?? 0)}`,
    hp, hpMax: d.mx, hpPct, tmpPct, hpColor: hpPct > 50 ? 'var(--ok)' : hpPct > 25 ? 'var(--gold)' : '#c8424c',
    hpAnim: hpTick ? `${hpKind === 'hit' ? (hpTick % 2 ? 'ficha-hpHitA' : 'ficha-hpHitB') : (hpTick % 2 ? 'ficha-healA' : 'ficha-healB')} .45s` : 'none',
    tmp, tmpDn: () => setTmp(Math.max(0, tmp - 1)), tmpUp: () => setTmp(tmp + 1),
    amt, onAmt: (e: ChangeEvent<HTMLInputElement>) => setAmt(Math.max(0, +e.target.value || 0)),
    dmg: () => { const fromTmp = Math.min(tmp, amt); setTmp(tmp - fromTmp); setHp(hp - (amt - fromTmp), 'hit') },
    heal: () => setHp(hp + amt, 'heal'), hd: hdLeft,
    down: hp === 0,
    dsOk: [0, 1, 2].map(i => pip(i < ds.ok, () => setDs({ ...ds, ok: ds.ok === i + 1 ? i : i + 1 }), 'Sucesso', 'var(--ok)')),
    dsFail: [0, 1, 2].map(i => pip(i < ds.fail, () => setDs({ ...ds, fail: ds.fail === i + 1 ? i : i + 1 }), 'Falha', '#c8424c')),
    deathRoll: () => {
      const r = roll('Salvaguarda contra a morte', 1, 20, 0, { tag: 'Contra a morte' })
      if (r.nat === 20) return setHp(1, 'heal')
      setDs(x => (r.total >= 10 ? { ...x, ok: Math.min(3, x.ok + 1) } : { ...x, fail: Math.min(3, x.fail + (r.nat === 1 ? 2 : 1)) }))
    },
    attacks: d.armas.map(a => {
      const dn = parseDano(a.dano)
      return {
        n: a.n, d: a.d, b: sg(a.b), dd: a.dano || '—',
        atk: () => roll(`${a.n} · ataque`, 1, 20, a.b, { tag: 'Ataque' }),
        dmg: () => {
          if (!dn) return
          let extra: [number, number][] = []
          if (smite && spendSlot()) { extra = [[2, 8]]; setSmite(false) }
          roll(`${a.n} · dano${extra.length ? ' + Destruição Divina' : ''}`, dn[0], dn[1], dn[2], { extra, tag: extra.length ? 'Radiante!' : '' })
        },
      }
    }),
    slotsLeft, isPaladino,
    swSmite: { track: smite ? 'var(--accent)' : 'var(--line)', knob: smite ? '21px' : '3px', go: () => setSmite(!smite) }, smiteBg: smite ? 'var(--gold)' : 'var(--line)',
    skills: d.skills.map(s => {
      const b = s.b ?? M[s.a] ?? 0
      return { n: s.n, a: s.a, b: sg(b), dot: b > (M[s.a] ?? 0) ? 'var(--accent)' : 'transparent', dis: '', go: () => roll(s.n, 1, 20, b) }
    }),
    // TODO(api): atributo de conjuração da classe.
    spStats: [{ v: '—', l: 'Atributo' }, { v: '—', l: 'Ataque mágico' }, { v: '—', l: 'CD de magia' }, { v: '0', l: 'Preparadas' }],
    slotsTitulo: slot ? `Espaços de ${slot.level}º círculo` : 'Sem espaços de magia',
    slots: slot ? Array.from({ length: slot.total }, (_, i) => pip(i < slotsLeft, () => usar(i < slotsLeft ? 1 : -1), i < slotsLeft ? 'Gastar espaço' : 'Recuperar espaço')) : [],
    spells: [] as { n: string; lv: string; tag: string; meta: string; d: string; anim: string; btn: string; btnBg: string; btnColor: string; cast: () => void }[], // TODO(api): magias
    resources: [] as { n: string; d: string; pips: ReturnType<typeof pip>[] }[], // TODO(api): recursos de classe
    loh, lohMax, lohPct: lohMax ? Math.round(loh / lohMax * 100) : 0,
    lohBtns: [1, 5, 10].map(x => ({ l: `+${x} PV`, go: () => { const g = Math.min(x, loh, d.mx - hp); if (g > 0) { setLoh(loh - g); setHp(hp + g, 'heal') } } })),
    items: [] as { icon: LucideIcon; n: string; d: string; q: number; w: string; tag: string; tagD: string; tagBg: string; tagColor: string; anim: string; dn: () => void; up: () => void; usable: boolean; use: () => void; equip: boolean; eqLabel: string; eqBg: string; eqColor: string; eqRing: string; toggle: () => void }[], // TODO(api): inventário
    coins: [['Ouro', 'radial-gradient(circle at 35% 30%, #fff1b0, #d9a22a 55%, #8a6320)'], ['Prata', 'radial-gradient(circle at 35% 30%, #ffffff, #b8b8b0 55%, #6a6a66)'], ['Cobre', 'radial-gradient(circle at 35% 30%, #f6c8a0, #b8642a 55%, #6e3210)']].map(([l, bg]) => ({ l, bg, v: 0, on: () => { /* TODO(api): moedas */ } })),
    load: '0', loadPct: 0, loadColor: 'var(--gold)',
    cargaMax: String(+(forca * 7.5).toFixed(1)).replace('.', ','), cargaNota: `FOR ${forca} × 7,5 kg.`,
    feats: [] as { src: string; n: string; d: string }[], // TODO(api): traços
    diarioTitulo: `Diário de ${d.nome.split(' ')[0]}`,
    diary, onDiary: (e: ChangeEvent<HTMLTextAreaElement>) => { setDiary(e.target.value); salvarTexto('diario', 'Diário', e.target.value) },
    oaths, onOaths: (e: ChangeEvent<HTMLTextAreaElement>) => { setOaths(e.target.value); salvarTexto('juramentos', 'Juramentos e aliados', e.target.value) },
    toasts,
  }
}

export type Vals = ReturnType<typeof useFichaVals>
