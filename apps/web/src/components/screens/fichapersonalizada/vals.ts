'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Backpack, NotebookPen, ScrollText } from 'lucide-react'
import { dcHref } from '@/lib/dc-routes'
import { useInventario } from '@/lib/inventario'
import type { InvInicial } from '@/lib/inventario-dados'
import { avaliarFormula, type AtributoSis, type Mecanica, type SistemaProprio } from '@/lib/sistema-proprio'

/** Dados reais de /personagens/[id] para sistemas feitos por usuário (SAGA Ficha Personalizada). */
export type FichaPersonalizadaDados = {
  id: string; nome: string; img: string | null; linha: string; voltarHref: string; podeEditar: boolean
  sistema: SistemaProprio
  valores: Record<string, number>
  hp: number; maxHp: number
  recursosValores: Record<string, { current: number; max: number }>
  /** Sistema sem recursos: as barras da campanha (vida e as outras). */
  barrasCampanha: { key: string; label: string; cor: string }[]
  notas: string
  inventario: InvInicial
}
type Toast = { id: number; label: string; detail: string; total: number | string; tag: string; color: string; ring: string; tagColor: string }
type Barra = { key: string; nome: string; formula: string; cor: string; vida: boolean }

const ML: Record<Mecanica, string> = { soma: 'd20 + modificador', parada: 'parada de d10 · 7+ é sucesso', abaixo: 'd100 abaixo de atributo × 5' }
const MN: Record<Mecanica, string> = { soma: 'Soma', parada: 'Parada', abaixo: 'Rolar abaixo' }
const sg = (v: number) => (v >= 0 ? '+' : '') + v
const R = (n: number) => 1 + Math.floor(Math.random() * n)
const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || 'recurso'
const json = (url: string, method: string, body: unknown) => fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null)

export function useFichaPersonalizadaVals(d: FichaPersonalizadaDados) {
  const api = `/api/characters/${d.id}`
  const S = d.sistema, M = S.mecanica
  const attrs = S.atributos.filter(a => a.tipo === 'atributo'), skills = S.atributos.filter(a => a.tipo === 'pericia')
  const [vals, setVals] = useState<Record<string, number>>(d.valores)
  const [tab, setTab] = useState<'main' | 'inv' | 'notes'>('main')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [notes, setNotes] = useState(d.notas)
  const tt = useRef<ReturnType<typeof setTimeout>[]>([])
  const saveT = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  useEffect(() => () => { tt.current.forEach(clearTimeout); Object.values(saveT.current).forEach(clearTimeout) }, [])
  const later = (k: string, fn: () => void, ms = 500) => { clearTimeout(saveT.current[k]); saveT.current[k] = setTimeout(fn, ms) }

  const toast = (label: string, detail: string, total: number | string, tag = '', good: 'crit' | 'bad' | 'ok' | null = null) => {
    const id = Date.now() + Math.random()
    setToasts(ts => [...ts, { id, label, detail, total, tag, color: good === 'crit' ? '#f3dc94' : good === 'bad' ? '#e8a080' : '#f1e3c2', ring: good === 'crit' ? '#c9a22a' : 'rgb(201 162 42/.3)', tagColor: good === 'bad' ? '#e8a080' : good === 'crit' ? '#f3dc94' : '#8fbf6a' }].slice(-4))
    tt.current.push(setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), 4400))
  }
  const val = (a: AtributoSis) => vals[a.nome] ?? a.min
  const mod = (v: number) => Math.floor((v - 10) / 2)
  // Faixa curta (até 6) é a própria parada / bônus; faixa longa usa modificador, ÷3 ou ×5.
  const curto = (a: AtributoSis) => a.max <= 6
  const alvoDe = (a: AtributoSis | null, bonus: number) => (a ? (curto(a) ? val(a) * 15 : val(a) * 5) : 0) + bonus * 5
  const rolar = (label: string, a: AtributoSis | null, bonus = 0) => {
    if (M === 'soma') {
      const r = R(20), m = (a ? (curto(a) ? val(a) : mod(val(a))) : 0) + bonus
      toast(label, `1d20${sg(m)} · [${r}]`, r + m, r === 20 ? 'Crítico!' : r === 1 ? 'Falha crítica' : '', r === 20 ? 'crit' : r === 1 ? 'bad' : null)
    } else if (M === 'parada') {
      const n = Math.max(1, (a ? (curto(a) ? val(a) : Math.ceil(val(a) / 3)) : 0) + bonus), r = Array.from({ length: Math.min(n, 30) }, () => R(10)), k = r.filter(x => x >= 7).length
      toast(label, `${r.length}d10 · 7+ · [${r.join(', ')}]`, k, k ? `${k} sucesso${k > 1 ? 's' : ''}` : 'Falha', k ? 'ok' : 'bad')
    } else {
      const alvo = alvoDe(a, bonus), r = R(100)
      toast(label, `d100 contra ${alvo}`, r, r <= alvo ? (r <= Math.floor(alvo / 5) ? 'Sucesso extremo' : 'Sucesso') : 'Falha', r <= alvo ? 'ok' : 'bad')
    }
  }
  const mudar = (a: AtributoSis, v: number) => {
    const nv = Math.max(a.min, Math.min(a.max, v))
    setVals(x => ({ ...x, [a.nome]: nv }))
    if (d.podeEditar) later(`a:${a.nome}`, () => { void json(`${api}/attributes`, 'POST', { name: a.nome, value: nv }) })
  }

  // Recursos: os do sistema (fórmula com siglas) ou, sem eles, as barras da campanha.
  const porSigla = Object.fromEntries(S.atributos.map(a => [a.sigla, val(a)]))
  const barras: Barra[] = S.recursos.length
    ? S.recursos.map((r, i) => ({ key: /vida|^pv$|pontos de vida/i.test(r.nome) && !S.recursos.slice(0, i).some(x => /vida|^pv$|pontos de vida/i.test(x.nome)) ? 'hp' : slug(r.nome), nome: r.nome, formula: r.formula, cor: r.cor, vida: /vida|^pv$/i.test(r.nome) }))
    : d.barrasCampanha.map(b => ({ key: b.key, nome: b.label, formula: '', cor: b.cor, vida: b.key === 'hp' }))
  const [res, setRes] = useState<Record<string, number>>(() => Object.fromEntries(barras.map(b => [b.key, b.key === 'hp' ? d.hp : d.recursosValores[b.key]?.current ?? 0])))
  const maxDe = (b: Barra) => (b.formula ? avaliarFormula(b.formula, porSigla) : b.key === 'hp' ? d.maxHp : d.recursosValores[b.key]?.max ?? 0)
  const mudarRes = (b: Barra, dv: number) => {
    const max = maxDe(b), nv = Math.max(0, Math.min(max || 9999, (res[b.key] ?? 0) + dv))
    setRes(r => ({ ...r, [b.key]: nv }))
    if (!d.podeEditar) return
    later(`r:${b.key}`, () => { void json(api, 'PATCH', b.key === 'hp' ? { hp: nv, maxHp: Math.max(1, max) } : { resources: { [b.key]: { current: nv, max } } }) })
  }

  const inv = useInventario({ id: d.id, podeEditar: d.podeEditar, inicial: d.inventario, nomeCurto: d.nome.split(' ')[0] ?? d.nome, temCa: false, cargaMax: 120, toast: (l, dt, t, tag) => toast(l, dt, t, tag ?? '', 'ok') })

  return {
    $href: (link: string) => dcHref(link, { characterId: d.id }),
    $img: (_id: string): string | null => d.img,
    voltarHref: d.voltarHref, img: d.img, init: (d.nome[0] ?? '?').toUpperCase(), nome: d.nome, linha: d.linha,
    sistema: S.nome, autorLine: S.autor ? `sistema da comunidade · por ${S.autor}` : 'sistema próprio',
    // A mecânica é a do sistema (o design alterna só no protótipo).
    mechs: [{ l: MN[M], go: () => {}, bg: 'var(--surface)', color: 'var(--ink)', sh: '0 1px 2px rgb(0 0 0/.1)' }], mechLine: ML[M],
    tabs: ([['main', 'Principal', ScrollText], ['inv', 'Inventário', Backpack], ['notes', 'Notas', NotebookPen]] as const).map(([k, l, icon]) => ({ l, icon, go: () => setTab(k), color: tab === k ? 'var(--ink)' : 'var(--muted)', line: tab === k ? 'inset 0 -2px 0 var(--accent)' : 'none' })),
    tMain: tab === 'main', tInv: tab === 'inv', tNotes: tab === 'notes',
    notes, onNotes: (e: ChangeEvent<HTMLTextAreaElement>) => {
      const v = e.target.value; setNotes(v)
      if (d.podeEditar) later('notas', () => { void json(`${api}/text-fields`, 'POST', { key: 'notas', label: 'História e notas', value: v, order: 0 }) }, 800)
    },
    attrs: attrs.map(a => {
      const v = val(a)
      return {
        n: a.nome, sg: a.sigla, v, range: `${a.min}–${a.max}`, dnOp: v <= a.min || !d.podeEditar ? 0.3 : 1, upOp: v >= a.max || !d.podeEditar ? 0.3 : 1,
        roll: () => rolar(a.nome, a), dn: () => { if (d.podeEditar) mudar(a, v - 1) }, up: () => { if (d.podeEditar) mudar(a, v + 1) },
      }
    }),
    temPericias: skills.length > 0,
    skills: skills.map(k => {
      const base = k.base ? attrs.find(a => a.sigla === k.base) ?? null : null, b = val(k)
      return { n: k.nome, sg: base?.sigla ?? '', b: M === 'abaixo' ? `${alvoDe(base, b)}%` : sg(b), roll: () => rolar(k.nome, base, b) }
    }),
    res: barras.map(b => {
      const max = maxDe(b), v = Math.min(res[b.key] ?? 0, max || Infinity), pct = max ? Math.round(v / max * 100) : 0
      return {
        n: b.nome, v, max, f: b.formula ? `fórmula: ${b.formula}` : 'barra da campanha', pct,
        c: b.vida ? (pct < 35 ? 'var(--blood)' : 'var(--ok)') : b.cor,
        btns: ([[-5, '−5'], [-1, '−1'], [1, '+1'], [5, '+5']] as const).map(([dv, l]) => ({ l, go: () => mudarRes(b, dv), bg: dv < 0 ? 'color-mix(in oklab, var(--blood) 12%, transparent)' : 'color-mix(in oklab, var(--ok) 14%, transparent)', color: dv < 0 ? 'var(--blood)' : 'var(--ok)' })),
      }
    }),
    inv, toasts,
  }
}

export type Vals = ReturnType<typeof useFichaPersonalizadaVals>
