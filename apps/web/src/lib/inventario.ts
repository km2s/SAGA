'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import type { InvInicial, Item, Moedas } from './inventario-dados'
export type { InvInicial, Item, Moedas } from './inventario-dados'
import { Backpack, FlaskConical, Gem, Key, Mail, Scroll, Shield, ShieldHalf, Sword, type LucideIcon } from 'lucide-react'

/**
 * Inventário, moedas e XP (SAGA Ficha Inventario). Uma lógica para a Ficha de D&D
 * e a Ficha Personalizada; grava em CharacterSheet.inventarioJson / moedasJson / xp
 * por PATCH /api/characters/[id].
 */
export type InvOpts = {
  id: string; podeEditar: boolean; inicial: InvInicial; nomeCurto: string
  /** Ficha de D&D: CA pela armadura e escudo. A personalizada não tem CA. */
  temCa: boolean; destreza?: number
  /** Carga máxima em kg (D&D: FOR × 7,5). */
  cargaMax: number
  toast: (label: string, detail: string, total: number | string, tag?: string) => void
}

/** Limiares de XP do D&D 5e (níveis 1–20). */
export const NIVEIS_XP = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000]
const IC: [string, LucideIcon, string][] = [['sword', Sword, 'Arma'], ['shield', Shield, 'Escudo'], ['shield-half', ShieldHalf, 'Armadura'], ['flask-conical', FlaskConical, 'Poção'], ['scroll', Scroll, 'Pergaminho'], ['gem', Gem, 'Joia'], ['backpack', Backpack, 'Equipamento'], ['key', Key, 'Chave'], ['mail', Mail, 'Carta']]
const TY: [string, string][] = [['comum', 'Comum'], ['arma', 'Arma'], ['armadura', 'Armadura'], ['escudo', 'Escudo'], ['consumivel', 'Consumível'], ['missao', 'Missão']]
const COIN: [keyof Moedas, string, string, number][] = [['pc', 'Cobre', '#b87333', .01], ['pp', 'Prata', '#c0c0c8', .1], ['pe', 'Electro', '#d8c890', .5], ['po', 'Ouro', '#d8ab4a', 1], ['pl', 'Platina', '#e4e6ee', 10]]
const TAG: Record<string, [string, string, string]> = { arma: ['Arma', 'var(--surface2)', 'var(--ink)'], armadura: ['Armadura', 'var(--surface2)', 'var(--ink)'], escudo: ['Escudo', 'var(--surface2)', 'var(--ink)'], consumivel: ['Consumível', 'color-mix(in oklab, var(--ok) 14%, transparent)', 'var(--ok)'], missao: ['Missão', 'var(--gold-t)', 'color-mix(in oklab, var(--gold) 70%, var(--ink))'], comum: ['', 'transparent', 'var(--muted)'] }
const iconeDe = (k: string) => (IC.find(x => x[0] === k) ?? IC[6]!)[1]
const kg = (v: number) => String(+v.toFixed(1)).replace('.', ',')
type Ed = { id: string | null; ic: string; n: string; d: string; q: string; w: string; ty: string; ca: string; err?: boolean }

export function useInventario(o: InvOpts) {
  const api = `/api/characters/${o.id}`
  const [items, setItems] = useState<Item[]>(o.inicial.itens)
  const [coins, setCoins] = useState<Moedas>(o.inicial.moedas)
  const [xp, setXp] = useState(o.inicial.xp)
  const [hist, setHist] = useState(o.inicial.hist)
  const [xpOpen, setXpOpen] = useState(false)
  const [xpIn, setXpIn] = useState('')
  const [xpWhy, setXpWhy] = useState('')
  const [xpErr, setXpErr] = useState(0)
  const [lvlUp, setLvlUp] = useState(false)
  const [ed, setEd] = useState<Ed | null>(null)
  const [fresh, setFresh] = useState<string | null>(null)
  const [coinK, setCoinK] = useState<keyof Moedas>('po')
  const [coinIn, setCoinIn] = useState('')
  const [coinErr, setCoinErr] = useState('')
  const [shake, setShake] = useState(0)
  const [caTick, setCaTick] = useState(0)

  // Grava inventário e moedas 600 ms depois da última mudança (não no primeiro render).
  const pronto = useRef(false), t = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => {
    if (!pronto.current) { pronto.current = true; return }
    if (!o.podeEditar) return
    clearTimeout(t.current)
    t.current = setTimeout(() => { void fetch(api, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inventario: items, moedas: coins }) }).catch(() => null) }, 600)
  }, [items, coins]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimeout(t.current), [])

  const nivelDe = (x: number) => NIVEIS_XP.filter(v => x >= v).length
  const lvl = nivelDe(xp), nxt = NIVEIS_XP[lvl] ?? xp, prev = NIVEIS_XP[lvl - 1] ?? 0
  const give = async (raw: string) => {
    const n = parseInt(raw, 10)
    if (!n || n < 0 || !o.podeEditar) { setXpErr(e => e + 1); return }
    const motivo = xpWhy.trim() || 'Concedido pelo Mestre'
    const r = await fetch(api, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ xpGanho: { v: n, motivo } }) }).catch(() => null)
    const j = r?.ok ? await r.json().catch(() => null) as { xp?: number } | null : null
    if (typeof j?.xp !== 'number') { setXpErr(e => e + 1); return }
    const subiu = nivelDe(j.xp) > lvl
    setXp(j.xp); setHist(h => [{ w: motivo, v: n }, ...h].slice(0, 5)); setXpIn(''); setXpWhy('')
    if (subiu) { setLvlUp(true); setXpOpen(false) }
  }

  const armor = items.find(i => i.ty === 'armadura' && i.eq), shield = items.find(i => i.ty === 'escudo' && i.eq)
  const des = o.destreza ?? 0
  // Armadura: o valor dela (o bônus de DES fica por conta de quem preenche a CA da armadura); sem armadura, 10 + DES.
  const ca = (armor ? +(armor.ca ?? 0) || 10 : 10 + des) + (shield ? +(shield.ca ?? 0) || 0 : 0)
  const load = items.reduce((a, i) => a + i.q * (+i.w || 0), 0), lp = Math.min(100, load / Math.max(1, o.cargaMax) * 100)
  const setItem = (id: string, p: Partial<Item>) => { setItems(xs => xs.map(i => (i.id === id ? { ...i, ...p } : i))); if ('eq' in p) setCaTick(n => n + 1) }
  const tirar = (id: string) => setItems(xs => xs.filter(x => x.id !== id))
  const total = COIN.reduce((a, [k, , , v]) => a + coins[k] * v, 0)
  const amt = parseInt(coinIn, 10) || 0
  const chip = (on: boolean, go: () => void, l: string) => ({ l, on, go, bg: on ? 'var(--ink)' : 'var(--surface)', color: on ? 'var(--bg)' : 'var(--ink)', ring: on ? 'var(--ink)' : 'var(--line)' })
  const edVal = ed ?? { id: null, ic: 'backpack', n: '', d: '', q: '1', w: '0', ty: 'comum', ca: '' }

  return {
    nomeCurto: o.nomeCurto, cargaMax: kg(o.cargaMax), temCa: o.temCa,
    // XP
    xpLine: `${xp.toLocaleString('pt-BR')} / ${nxt.toLocaleString('pt-BR')} XP`, xpPct: Math.min(100, Math.round((xp - prev) / Math.max(1, nxt - prev) * 100)), lvl,
    xpOpen, xpToggle: () => setXpOpen(x => !x), xpIn, onXpIn: (e: ChangeEvent<HTMLInputElement>) => setXpIn(e.target.value.replace(/\D/g, '').slice(0, 6)), xpWhy, onXpWhy: (e: ChangeEvent<HTMLInputElement>) => setXpWhy(e.target.value.slice(0, 80)),
    xpRing: xpErr % 2 ? 'var(--blood)' : 'var(--line)', xpPre: [50, 100, 300, 1000].map(v => ({ v, go: () => setXpIn(String(v)) })), xpGive: () => { void give(xpIn) },
    xpHist: hist, lvlUp, lvlOk: () => setLvlUp(false),
    // Editor de item
    addItem: () => setEd({ id: null, ic: 'backpack', n: '', d: '', q: '1', w: '0', ty: 'comum', ca: '' }),
    hasEd: !!ed && o.podeEditar, edTitle: ed?.id ? 'Editar item' : 'Novo item', edIsEdit: !!ed?.id, ed: edVal, edRing: ed?.err ? 'var(--blood)' : 'var(--line)',
    icons: IC.map(([k, icon, n]) => ({ icon, n, bg: ed?.ic === k ? 'var(--ink)' : 'var(--surface)', color: ed?.ic === k ? 'var(--bg)' : 'var(--accent)', ring: ed?.ic === k ? 'var(--ink)' : 'var(--line)', go: () => setEd({ ...edVal, ic: k }) })),
    edN: (e: ChangeEvent<HTMLInputElement>) => setEd({ ...edVal, n: e.target.value.slice(0, 80), err: false }), edD: (e: ChangeEvent<HTMLInputElement>) => setEd({ ...edVal, d: e.target.value.slice(0, 200) }),
    edQ: (e: ChangeEvent<HTMLInputElement>) => setEd({ ...edVal, q: e.target.value.replace(/\D/g, '').slice(0, 4) }), edW: (e: ChangeEvent<HTMLInputElement>) => setEd({ ...edVal, w: e.target.value.replace(/[^\d.,]/g, '').slice(0, 6) }),
    edCa: (e: ChangeEvent<HTMLInputElement>) => setEd({ ...edVal, ca: e.target.value.replace(/\D/g, '').slice(0, 2) }),
    edHasCa: o.temCa && (edVal.ty === 'armadura' || edVal.ty === 'escudo'), edCaL: edVal.ty === 'escudo' ? 'Bônus de CA' : 'CA da armadura',
    edTypes: TY.filter(([k]) => o.temCa || (k !== 'armadura' && k !== 'escudo')).map(([k, l]) => chip(edVal.ty === k, () => setEd({ ...edVal, ty: k }), l)),
    edCancel: () => setEd(null), edDel: () => { if (ed?.id) tirar(ed.id); setEd(null) },
    edSave: () => {
      if (!ed) return
      if (!ed.n.trim()) { setEd({ ...ed, err: true }); return }
      const item = { ic: ed.ic, n: ed.n.trim(), d: ed.d.trim(), q: Math.max(1, +ed.q || 1), w: +String(ed.w).replace(',', '.') || 0, ty: ed.ty, ...(+ed.ca ? { ca: +ed.ca } : {}) }
      if (ed.id) setItems(xs => xs.map(i => (i.id === ed.id ? { ...i, ...item } : i)))
      else { const id = `i${Date.now().toString(36)}`; setItems(xs => [...xs, { ...item, id, eq: 0 }]); setFresh(id) }
      setEd(null)
    },
    noItems: items.length === 0,
    items: items.map(i => {
      const isEq = ['arma', 'armadura', 'escudo'].includes(i.ty) && (o.temCa || i.ty === 'arma'), T = TAG[i.ty] ?? TAG.comum!
      return {
        n: i.n, d: i.d, q: i.q, icon: iconeDe(i.ic), tag: T[0], tagBg: T[1], tagC: T[2], wt: i.w ? `${kg(i.q * i.w)} kg` : '—', anim: i.id === fresh ? 'fichainventario-popIn .3s both' : 'none',
        edit: () => { if (o.podeEditar) setEd({ id: i.id, ic: i.ic, n: i.n, d: i.d, q: String(i.q), w: String(i.w).replace('.', ','), ty: i.ty, ca: String(i.ca ?? '') }) },
        dn: () => { if (!o.podeEditar) return; if (i.q > 1) setItem(i.id, { q: i.q - 1 }); else tirar(i.id) }, up: () => { if (o.podeEditar) setItem(i.id, { q: i.q + 1 }) },
        equip: isEq, eqL: i.eq ? 'Equipado' : 'Equipar', eqBg: i.eq ? 'var(--accent-t)' : 'transparent', eqC: i.eq ? 'var(--accent)' : 'var(--ink)', eqRing: i.eq ? 'var(--accent)' : 'var(--line)',
        toggle: () => {
          if (!o.podeEditar) return
          // Uma armadura e um escudo por vez.
          if (!i.eq && (i.ty === 'armadura' || i.ty === 'escudo')) { setItems(xs => xs.map(x => (x.ty === i.ty ? { ...x, eq: x.id === i.id ? 1 : 0 } : x))); setCaTick(n => n + 1) }
          else setItem(i.id, { eq: i.eq ? 0 : 1 })
        },
        use: i.ty === 'consumivel', usar: () => {
          if (!o.podeEditar) return
          // Efeito com dado na descrição ("Recupera 2d4+2 PV") é rolado; senão só gasta um.
          const m = i.d.replace(/\s/g, '').match(/(\d*)d(\d+)([+-]\d+)?/i)
          if (m) {
            const n = Math.max(1, +(m[1] || 1)), dd = +m[2]!, mod = m[3] ? +m[3] : 0, r = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * dd))
            o.toast(`Usou ${i.n}`, `${n}d${dd}${m[3] ?? ''} · [${r.join(', ')}]`, r.reduce((a, b) => a + b, 0) + mod, 'Efeito')
          } else o.toast(`Usou ${i.n}`, i.d || 'Consumível', '✓')
          if (i.q > 1) setItem(i.id, { q: i.q - 1 }); else tirar(i.id)
        },
      }
    }),
    // Bolsa
    coins: COIN.map(([k, n, c]) => ({ k: k.toUpperCase(), n, c, v: coins[k], ring: coinK === k ? 'var(--accent)' : 'var(--line)', bg: coinK === k ? 'var(--accent-t)' : 'transparent', anim: 'none', pick: () => { setCoinK(k); setCoinErr('') } })),
    coinK: coinK.toUpperCase(), coinIn, onCoinIn: (e: ChangeEvent<HTMLInputElement>) => { setCoinIn(e.target.value.replace(/\D/g, '').slice(0, 6)); setCoinErr('') },
    coinAdd: () => { if (amt && o.podeEditar) { setCoins(c => ({ ...c, [coinK]: c[coinK] + amt })); setCoinIn(''); setCoinErr('') } },
    coinSub: () => {
      if (!amt || !o.podeEditar) return
      if (coins[coinK] < amt) { setCoinErr(`Faltam ${amt - coins[coinK]} ${coinK.toUpperCase()}. Troque outras moedas ou gaste menos.`); setShake(n => n + 1); return }
      setCoins(c => ({ ...c, [coinK]: c[coinK] - amt })); setCoinIn('')
    },
    coinErr, coinShake: shake ? `${shake % 2 ? 'fichainventario-shakeA' : 'fichainventario-shakeB'} .45s both` : 'none',
    coinTotal: String(+total.toFixed(2)).replace('.', ','),
    coinNorm: () => {
      if (!o.podeEditar) return
      let cp = Math.round(total * 100)
      const pl = Math.floor(cp / 1000); cp -= pl * 1000
      const po = Math.floor(cp / 100); cp -= po * 100
      const pp = Math.floor(cp / 10); cp -= pp * 10
      setCoins({ pc: cp, pp, pe: 0, po, pl })
    },
    load: kg(load), loadPct: lp, loadC: lp > 80 ? 'var(--blood)' : lp > 50 ? 'var(--gold)' : 'var(--ok)',
    ca, caEquipada: !!(armor || shield), caAnim: caTick ? `${caTick % 2 ? 'fichainventario-shakeA' : 'fichainventario-shakeB'} .4s both` : 'none',
    caLine: `${armor ? `${armor.n} (${armor.ca ?? 10})` : `Sem armadura (10 + DES ${des >= 0 ? '+' : ''}${des})`}${shield ? ` + ${shield.n.split(' ')[0]!.toLowerCase()} (+${shield.ca ?? 0})` : ''}`,
  }
}

export type InvVals = ReturnType<typeof useInventario>
