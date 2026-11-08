'use client'

import { useRef, useState, type ChangeEvent } from 'react'
import { Cpu, Dices, Feather, Percent, Swords, Compass, CircleDot } from 'lucide-react'
import { R, W, type Cell, type Track, type W as Widget } from './tipos'
import type { Bolinhas, Ctx, Fonte, Maximo, Peca, Regra, Sel, SistemaSpec, Trilha } from './spec'

/** Dados reais da ficha (app/(app)/personagens/[id]/page.tsx). */
export type FichaSistemaDados = {
  id: string; nome: string; img: string | null; sistema: string; campanha: string; podeEditar: boolean
  voltarHref: string; publicaHref: string | null
  hp: number; max: number; temPv: boolean
  attrs: { id: string; n: string; desc: string; v: number; die: string }[]
  tf: Record<string, string>
  armas: { id: string; n: string; b: string; d: string; ty: string; al: string; pr: string }[]
  nivel: number
  slots: { level: number; total: number; used: number }[]
}

type Toast = { id: number; label: string; detail: string; total: string | number; tag: string; color: string; ring: string; tagColor: string }
const sg = (v: number) => (v >= 0 ? '+' : '') + v
const RULE: Record<Regra, string> = {
  v5: 'Parada de d10 · 6+ é sucesso · par de 10 é crítico', wod: 'Parada de d10 contra dificuldade 6', cod: 'Parada de d10 · 8+ é sucesso · 10 explode',
  d20: 'd20 + modificador · clique num atributo', pf2: 'd20 + mod · 10 acima da CD é crítico', coc: 'd100 · ½ difícil · ⅕ extremo', pct: 'd100 igual ou abaixo do valor',
  ms: 'd100 abaixo do valor · dígitos iguais são crítico', dw: '2d6 + mod · 10+ sucesso · 7–9 com custo', isw: 'd6 + atributo contra 2d10', fate: '4dF + perícia contra a dificuldade',
  bitd: 'Parada de d6 pela ação · fica o maior', sr: 'Parada de d6 · 5 e 6 são acertos', cpr: 'd10 + STAT + perícia contra CD', sw: 'Dados narrativos · aqui simplificado em sucessos',
  savage: 'Dado do atributo + dado selvagem d6 · 4+', gurps: '3d6 igual ou abaixo do valor',
}
const LEATHER: Record<string, string> = { dots: 'linear-gradient(150deg,#5a1a2e,#1c080e)', d20: 'linear-gradient(150deg,#7a4a14,#2a1804)', pct: 'linear-gradient(150deg,#6a1414,#1e0505)', pbta: 'linear-gradient(150deg,#3a5a3a,#0e1a0a)', narr: 'linear-gradient(150deg,#5a4a34,#1e180e)', pool: 'linear-gradient(150deg,#1e4a4a,#081a1a)', step: 'linear-gradient(150deg,#4a3a6a,#141026)' }
const ICONE = { dots: CircleDot, d20: Swords, pct: Percent, pbta: Compass, narr: Feather, pool: Cpu, step: Dices }
const json = (url: string, method: string, body?: unknown) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).catch(() => null)

/** Rolagem com a regra do sistema (SAGA Fichas por Sistema, roll()). Resultado no toast escuro, como na Ficha. */
function rolarRegra(rule: Regra, v: number) {
  const d = (n: number) => 1 + Math.floor(Math.random() * n), many = (k: number, n: number) => Array.from({ length: Math.max(1, k) }, () => d(n))
  let total: number, detail: string, tag = '', good: 'crit' | 'ok' | 'bad' | null = null
  if (rule === 'v5' || rule === 'wod' || rule === 'cod') {
    let r = many(v, 10); if (rule === 'cod') r = r.concat(r.filter(x => x === 10).map(() => d(10)))
    const t = rule === 'cod' ? 8 : 6; total = r.filter(x => x >= t).length; detail = `${Math.max(1, v)}d10 · [${r.join(', ')}]`
    const tens = r.filter(x => x === 10).length
    tag = rule === 'v5' && tens >= 2 ? 'Crítico!' : total ? `${total} sucesso${total > 1 ? 's' : ''}` : 'Falha'; good = rule === 'v5' && tens >= 2 ? 'crit' : total ? 'ok' : 'bad'
  } else if (rule === 'd20' || rule === 'pf2') { const r = d(20); total = r + v; detail = `1d20${sg(v)} · [${r}]`; good = r === 20 ? 'crit' : r === 1 ? 'bad' : null; tag = r === 20 ? 'Crítico!' : r === 1 ? 'Falha crítica' : '' }
  else if (rule === 'coc' || rule === 'pct' || rule === 'ms') {
    const r = d(100); total = r; detail = `d100 contra ${v}`
    if (rule === 'coc') tag = r === 1 ? 'Crítico!' : r <= Math.floor(v / 5) ? 'Sucesso extremo' : r <= Math.floor(v / 2) ? 'Sucesso difícil' : r <= v ? 'Sucesso' : r >= 96 ? 'Desastre' : 'Falha'
    else if (rule === 'ms') tag = (r < v ? 'Sucesso' : 'Falha') + (r % 11 === 0 || r === 100 ? ' crítico' : '')
    else tag = r <= v ? 'Sucesso' : 'Falha'
    good = /Crítico|extremo|crítico/.test(tag) && !/Falha/.test(tag) ? 'crit' : /Sucesso/.test(tag) ? 'ok' : 'bad'
  } else if (rule === 'dw') { const a = d(6), b = d(6); total = a + b + v; detail = `2d6${sg(v)} · [${a}, ${b}]`; tag = total >= 10 ? 'Sucesso pleno' : total >= 7 ? 'Sucesso com custo' : 'Falha · ganhe XP'; good = total >= 10 ? 'ok' : total >= 7 ? null : 'bad' }
  else if (rule === 'isw') { const a = d(6), c1 = d(10), c2 = d(10); total = Math.min(10, a + v); const w = Number(total > c1) + Number(total > c2); detail = `d6+${v} [${a}] contra [${c1}, ${c2}]`; tag = w === 2 ? 'Acerto forte' : w === 1 ? 'Acerto fraco' : 'Erro'; good = w === 2 ? 'ok' : w ? null : 'bad' }
  else if (rule === 'fate') { const f = many(4, 3).map(x => x - 2); total = f.reduce((a, b) => a + b, 0) + v; detail = `4dF${sg(v)} · [${f.map(x => x > 0 ? '+' : x < 0 ? '−' : '0').join(' ')}]`; const L = ['Terrível', 'Ruim', 'Medíocre', 'Regular', 'Razoável', 'Bom', 'Ótimo', 'Soberbo', 'Fantástico', 'Épico', 'Lendário']; tag = L[Math.max(0, Math.min(10, total + 2))]! }
  else if (rule === 'bitd') { const r = v ? many(v, 6) : [d(6), d(6)]; const top = v ? Math.max(...r) : Math.min(...r); total = top; detail = `${v || '0 → 2'}d6 · [${r.join(', ')}]`; const six = r.filter(x => x === 6).length; tag = v && six >= 2 ? 'Crítico!' : top === 6 ? 'Sucesso' : top >= 4 ? 'Sucesso com custo' : 'Falha'; good = /Crítico/.test(tag) ? 'crit' : top >= 4 ? 'ok' : 'bad' }
  else if (rule === 'sr' || rule === 'sw') { const r = many(v, 6); total = r.filter(x => x >= 5).length; detail = `${r.length}d6 · [${r.join(', ')}]`; tag = `${total} acerto${total === 1 ? '' : 's'}`; good = total ? 'ok' : 'bad' }
  else if (rule === 'cpr') { const r = d(10); total = r + v; detail = `1d10${sg(v)} · [${r}]`; tag = r === 10 ? 'Crítico! role de novo' : r === 1 ? 'Falha crítica' : ''; good = r === 10 ? 'crit' : r === 1 ? 'bad' : null }
  else if (rule === 'savage') { const a = d(Math.max(4, v)), w = d(6); total = Math.max(a, w); detail = `d${Math.max(4, v)} [${a}] · selvagem d6 [${w}]`; tag = total >= 8 ? 'Ampliação!' : total >= 4 ? 'Sucesso' : 'Falha'; good = total >= 8 ? 'crit' : total >= 4 ? 'ok' : 'bad' }
  else { const r = many(3, 6); total = r.reduce((a, b) => a + b, 0); detail = `3d6 contra ${v} · [${r.join(', ')}]`; tag = total <= 4 ? 'Sucesso crítico' : total >= 17 ? 'Falha crítica' : total <= v ? `Sucesso por ${v - total}` : `Falha por ${total - v}`; good = total <= 4 ? 'crit' : total <= v ? 'ok' : 'bad' }
  return { detail, total, tag, good }
}

export function useFichaSistema(d: FichaSistemaDados, spec: SistemaSpec) {
  const api = `/api/characters/${d.id}`
  const ed = d.podeEditar
  const [attrs, setAttrs] = useState(d.attrs)
  const [tf, setTf] = useState(d.tf)
  const [armas, setArmas] = useState(d.armas)
  const [hp, setHp] = useState(d.hp)
  const [slots, setSlots] = useState(d.slots)
  const [aba, setAba] = useState(0)
  const [rascunho, setRascunho] = useState<Record<string, string>>({})
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // ── Leitura ──
  const pega = (sel: Sel) => attrs.filter(a =>
    (sel.nomes?.some(n => n.toLowerCase() === a.n.toLowerCase())) ||
    (sel.prefixo?.some(p => a.desc.startsWith(p))))
    .sort((a, b) => sel.nomes ? sel.nomes.findIndex(n => n.toLowerCase() === a.n.toLowerCase()) - sel.nomes.findIndex(n => n.toLowerCase() === b.n.toLowerCase()) : 0)
  const attr = (nomes: string[]) => nomes.map(n => attrs.find(a => a.n.toLowerCase() === n.toLowerCase())).find(Boolean)
  const num = (s: string | undefined) => parseInt(s ?? '', 10) || 0
  const ctx: Ctx = { attr: nomes => attr(nomes)?.v, tf }
  const nBol = (b: Bolinhas | undefined, padrao = 5) => b === undefined ? padrao : typeof b === 'number' ? b : b(ctx)
  const maximo = (m: Maximo): number => typeof m === 'number' ? m : typeof m === 'function' ? m(ctx) : 'tf' in m ? num(tf[m.tf]) : 'attr' in m ? attr(m.attr)?.v ?? 0 : 'pv' in m ? d.max
    : m.soma.reduce((n, ns) => n + (attr(ns)?.v ?? 0), 0) + (m.mais ?? 0)
  const fonte = (f: Fonte, max: number) => 'attr' in f ? attr(f.attr)?.v ?? 0 : 'pv' in f ? hp : f.gasto ? Math.max(0, max - num(tf[f.tf])) : num(tf[f.tf])

  // ── Gravação (otimista; as rotas são as que as fichas antigas usam) ──
  const salvaAttr = (id: string, v: number) => {
    if (!ed) return
    setAttrs(xs => xs.map(a => a.id === id ? { ...a, v } : a))
    clearTimeout(timers.current[`a${id}`])
    timers.current[`a${id}`] = setTimeout(() => { void json(`${api}/attributes/${id}`, 'PATCH', { value: v }) }, 250)
  }
  const salvaTf = (key: string, label: string, v: string, espera = 0) => {
    if (!ed) return
    setTf(t => ({ ...t, [key]: v }))
    clearTimeout(timers.current[`t${key}`])
    timers.current[`t${key}`] = setTimeout(() => { void json(`${api}/text-fields`, 'POST', { key, label, value: v }) }, espera)
  }
  const grava = (f: Fonte, max: number, v: number) => {
    const x = Math.max(0, Math.min(max, v))
    if ('attr' in f) { const a = attr(f.attr); if (a) salvaAttr(a.id, x) }
    else if ('pv' in f) { if (ed) { setHp(x); clearTimeout(timers.current.hp); timers.current.hp = setTimeout(() => { void json(api, 'PATCH', { hp: x }) }, 300) } }
    else salvaTf(f.tf, f.label, String(f.gasto ? max - x : x))
  }

  // ── Rolagem ──
  const rolar = (label: string, v: number, regra: Regra = spec.regra) => {
    const r = rolarRegra(regra, v), id = Date.now() + Math.random()
    setToasts(ts => [...ts, { id, label, detail: r.detail, total: r.total, tag: r.tag, color: r.good === 'crit' ? '#f3dc94' : r.good === 'bad' ? '#e8a080' : '#f1e3c2', ring: r.good === 'crit' ? '#c9a22a' : 'rgb(201 162 42/.3)', tagColor: r.good === 'crit' ? '#f3dc94' : r.good === 'bad' ? '#e8a080' : '#8fbf6a' }].slice(-4))
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4600)
  }
  const rolarExpr = (label: string, e: string) => {
    const m = e.match(/(\d*)d(\d+)\s*([+-]\s*\d+)?/i)
    if (!m) { rolar(label, 0); return }
    const n = +(m[1] || 1), dd = +m[2]!, mod = +((m[3] ?? '0').replace(/\s/g, '')), rs = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * dd)), id = Date.now() + Math.random()
    setToasts(ts => [...ts, { id, label, detail: `${n}d${dd}${mod ? sg(mod) : ''} · [${rs.join(', ')}]`, total: rs.reduce((a, b) => a + b, 0) + mod, tag: '', color: '#f1e3c2', ring: 'rgb(201 162 42/.3)', tagColor: '#8fbf6a' }].slice(-4))
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4600)
  }

  // ── Trilhas (caixas/bolinhas, estados, barra) ──
  const trilha = (t: Trilha, compacta: boolean): Track => {
    if (t.forma === 'niveis') {
      const flags = Array.from({ length: t.niveis.length }, (_, i) => (tf[t.tf] ?? '')[i] === '1')
      const ultimo = flags.lastIndexOf(true)
      return { n: t.n, d: t.d ?? '', hasD: !!t.d, val: ultimo >= 0 ? t.niveis[ultimo]![0] : 'Ileso', vc: ultimo >= 0 ? 'var(--blood)' : 'var(--ink)', gap: '5px', acts: [], hasActs: false,
        cells: t.niveis.map(([nome, pen], i): Cell => ({ t: nome, lab: flags[i] ? '✕' : '', cap: compacta ? '' : pen, hasCap: !compacta && pen !== '', capC: flags[i] ? 'var(--blood)' : 'var(--muted)', w: compacta ? '18px' : '28px', h: compacta ? '18px' : '24px', fs: compacta ? '11px' : '13px', r: '3px', ring: 'var(--blood)',
          bg: flags[i] ? 'var(--blood)' : 'transparent', fg: '#fff', go: () => { const nf = [...flags]; nf[i] = !nf[i]; salvaTf(t.tf, t.label, nf.map(x => (x ? '1' : '0')).join('')) } })) }
    }
    const max = maximo(t.max)
    if (t.forma === 'estados') {
      const raw = (tf[t.tf] ?? '').split(',').filter(Boolean).map(Number)
      const box = Array.from({ length: max }, (_, i) => raw[i] ?? 0)
      const sup = box.filter(x => x === 1).length, agr = box.filter(x => x === 2).length
      return { n: t.n, d: t.d ?? '', hasD: !!t.d, val: `${sup} superficial · ${agr} agravado`, vc: sup + agr >= max ? 'var(--blood)' : 'var(--ink)', gap: '5px', acts: [], hasActs: false,
        cells: box.map((x, i): Cell => ({ t: `${i + 1}`, lab: ['', '╱', '✕'][x] ?? '', cap: '', hasCap: false, capC: 'var(--muted)', w: compacta ? '18px' : '24px', h: compacta ? '18px' : '24px', fs: compacta ? '11px' : '14px', r: '3px', ring: 'var(--blood)',
          bg: x === 2 ? 'var(--blood)' : x === 1 ? 'color-mix(in oklab, var(--blood) 22%, transparent)' : 'transparent', fg: x === 2 ? '#fff' : 'var(--blood)',
          go: () => { const nb = [...box]; nb[i] = ((nb[i] ?? 0) + 1) % 3; salvaTf(t.tf, t.label, nb.join(',')) } })) }
    }
    const v = fonte(t.fonte, max)
    if (t.forma === 'bar' || t.forma === 'num') {
      return { n: t.n, d: t.forma === 'bar' && max ? `${Math.round(v / max * 100)}% · ${t.d ?? 'ajuste com os botões'}` : t.d ?? '', hasD: true, val: `${v} / ${max}`, vc: v === 0 ? 'var(--muted)' : 'var(--ink)', gap: '6px', acts: [], hasActs: false,
        cells: ([['−5', -5], ['−1', -1], ['+1', 1], ['+5', 5]] as const).map(([lab, dd]): Cell => ({ t: lab, lab, cap: '', hasCap: false, capC: '', w: '42px', h: '18px', fs: '9px', r: '4px', ring: 'transparent', bg: dd < 0 ? 'color-mix(in oklab, var(--blood) 12%, transparent)' : 'color-mix(in oklab, var(--ok) 14%, transparent)', fg: dd < 0 ? 'var(--blood)' : 'var(--ok)', go: () => grava(t.fonte, max, v + dd) })) }
    }
    const cor = 'sangue' in t && t.sangue ? 'var(--blood)' : 'var(--accent)'
    return { n: t.n, d: t.d ?? ' ', hasD: !!t.d, val: `${v} / ${max}`, vc: v === 0 ? 'var(--muted)' : 'var(--ink)', gap: '6px', acts: [], hasActs: false,
      cells: Array.from({ length: max }, (_, i): Cell => ({ t: `${t.n} ${i + 1}`, lab: '', cap: '', hasCap: false, capC: '', w: '18px', h: '18px', fs: '9px', r: t.forma === 'dot' ? '50%' : '3px', ring: cor, bg: i < v ? cor : 'transparent', fg: '#fff', go: () => grava(t.fonte, max, v === i + 1 ? i : i + 1) })) }
  }

  // ── Peças das abas ──
  const usados = new Set<string>()
  const dots = (id: string, v: number, max: number) => Array.from({ length: max }, (_, i) => ({ t: `${i + 1}`, bg: i < v ? 'var(--accent)' : 'transparent', ring: 'var(--accent)', go: () => salvaAttr(id, v === i + 1 ? i : i + 1) }))
  const peca = (p: Peca): Widget[] => {
    if (p.tipo === 'texto') return [W({ isText: true, fields: p.campos.map(([key, l, longo]) => ({ l, v: tf[key] ?? '', on: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => salvaTf(key, l, e.target.value, 600), long: !!longo, short: !longo, rows: longo ? 4 : 3, ph: ed ? '' : '—', span: longo ? '1/-1' : 'auto' })) })]
    if (p.tipo === 'chips') return [W({ isChips: true, l: p.l, chips: p.opcoes.map(o => { const on = tf[p.tf] === o; return { l: o, t: o, on, hasDot: false, dot: '', bg: on ? 'var(--ink)' : 'var(--surface)', color: on ? 'var(--bg)' : 'var(--ink)', ring: on ? 'var(--ink)' : 'var(--line)', go: () => salvaTf(p.tf, p.label, on ? '' : o) } }) })]
    if (p.tipo === 'espacos') {
      const comEspaco = slots.filter(s => s.total > 0)
      if (!comEspaco.length) return [W({ isRows: true, hasFoot: true, foot: 'Sem espaços de magia nesta ficha.' })]
      return [W({ isBox: true, tracks: comEspaco.map((s): Track => ({
        n: `Círculo ${s.level}`, d: '', hasD: false, val: `${s.total - s.used} / ${s.total}`, vc: s.used >= s.total ? 'var(--muted)' : 'var(--ink)', gap: '6px', acts: [], hasActs: false,
        cells: Array.from({ length: s.total }, (_, i): Cell => ({
          t: `Espaço ${i + 1}`, lab: '', cap: '', hasCap: false, capC: '', w: '20px', h: '20px', fs: '10px', r: '50%', ring: 'var(--accent)', bg: i < s.total - s.used ? 'var(--accent)' : 'transparent', fg: '#fff',
          go: () => {
            if (!ed) return
            const used = i < s.total - s.used ? s.total - i : s.total - i - 1
            setSlots(xs => xs.map(x => x.level === s.level ? { ...x, used } : x))
            void json(`${api}/spell-slots`, 'PATCH', { level: s.level, used })
          },
        })),
      })) })]
    }
    if (p.tipo === 'trilhas') return [W({ isBox: true, tracks: p.trilhas.map(t => trilha(t, false)) })]
    if (p.tipo === 'listaTf') {
      // Lista guardada em textos (V20): base da ficha (ex.: disciplinas do clã) + extras "a|b|c".
      const extras = (tf[p.extras.key] ?? '').split('|').filter(Boolean)
      const base = p.base(ctx)
      const nomes = [...base, ...extras.filter(x => !base.includes(x))]
      const max = nBol(p.bolinhas)
      const salvaExtras = (xs: string[]) => salvaTf(p.extras.key, p.extras.label, xs.join('|'))
      return [W({
        isRows: true, l: p.l, hasAdd: ed, addL: p.novo,
        add: () => { let n = 1; while (nomes.includes(`${p.novo} ${n}`)) n++; salvaExtras([...extras, `${p.novo} ${n}`]) },
        groups: [{ l: '', hasL: false, rows: nomes.map(nome => {
          const v = num(tf[p.chave(nome)]), extra = !base.includes(nome)
          return R({
            n: rascunho[nome] ?? nome, edit: extra && ed,
            onN: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
              // Renomear leva o valor para a chave nova (a chave sai do nome, como na ficha antiga).
              // Grava só depois de uma pausa, para não criar uma chave por letra digitada.
              const novo = e.target.value
              setRascunho(r => ({ ...r, [nome]: novo }))
              clearTimeout(timers.current[`r${nome}`])
              timers.current[`r${nome}`] = setTimeout(() => {
                setRascunho(r => { const { [nome]: _, ...resto } = r; return resto })
                if (!novo.trim() || novo === nome || nomes.includes(novo)) return
                salvaExtras(extras.map(x => x === nome ? novo : x)); if (v) salvaTf(p.chave(novo), p.rotulo(novo), String(v))
              }, 900)
            },
            hasDots: true, dots: Array.from({ length: max }, (_, i) => ({ t: `${i + 1}`, bg: i < v ? 'var(--accent)' : 'transparent', ring: 'var(--accent)', go: () => salvaTf(p.chave(nome), p.rotulo(nome), String(v === i + 1 ? i : i + 1)) })),
            hasRoll: true, rollL: `${v}d10`, roll: () => rolar(nome, v),
            hasDel: extra && ed, del: () => salvaExtras(extras.filter(x => x !== nome)),
          })
        }) }],
      })]
    }
    if (p.tipo === 'armas') return [W({
      isTable: true, head: ['Nome', 'Bônus', 'Dano', 'Tipo', 'Alcance', 'Propriedades'], addL: 'Adicionar arma',
      add: async () => {
        if (!ed) return
        const r = await json(`${api}/weapons`, 'POST', { name: 'Nova arma', attackBonus: '+0', damage: '1d6' })
        const w = r?.ok ? await r.json().catch(() => null) as { id: string } | null : null
        if (w) setArmas(xs => [...xs, { id: w.id, n: 'Nova arma', b: '+0', d: '1d6', ty: '', al: '', pr: '' }])
      },
      trs: armas.map(x => ({
        cells: ([['n', 'Nome', '120px', "400 15px/1 'IM Fell English',serif", 'name'], ['b', 'Bônus', '46px', "600 12px/1 'Geist Mono',monospace", 'attackBonus'], ['d', 'Dano', '64px', "600 12px/1 'Geist Mono',monospace", 'damage'], ['ty', 'Tipo', '80px', "400 12px/1 'Geist',sans-serif", 'damageType'], ['al', 'Alcance', '86px', "400 12px/1 'Geist',sans-serif", 'range'], ['pr', 'Propriedades', '130px', "400 12px/1 'Geist',sans-serif", 'properties']] as const).map(([f, l, min, font, campo]) => ({
          l, min, font, v: x[f],
          on: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            if (!ed) return
            const v = e.target.value
            setArmas(xs => xs.map(y => y.id === x.id ? { ...y, [f]: v } : y))
            clearTimeout(timers.current[`w${x.id}${f}`]); timers.current[`w${x.id}${f}`] = setTimeout(() => { void json(`${api}/weapons/${x.id}`, 'PATCH', { [campo]: v }) }, 600)
          },
        })),
        atk: () => rolar(`Ataque · ${x.n}`, parseInt(x.b.replace(/[^\d-]/g, ''), 10) || 0, spec.familia === 'd20' ? spec.regra : 'd20'),
        dmg: () => rolarExpr(`Dano · ${x.n}`, x.d),
        del: () => { if (!ed) return; setArmas(xs => xs.filter(y => y.id !== x.id)); void json(`${api}/weapons/${x.id}`, 'DELETE') },
      })),
    })]
    // linhas
    const adicionar = p.adicionar
    return [W({
      isRows: true, l: p.l ?? '', min: p.min ?? '210px', hasAdd: !!adicionar && ed, addL: adicionar?.label ?? '',
      add: async () => {
        if (!adicionar || !ed) return
        const nome = `${adicionar.label.replace(/^Nov[oa] /, '').replace(/^./, c => c.toUpperCase())} ${attrs.filter(a => a.desc.startsWith(adicionar.descricao.split(' —')[0]!)).length + 1}`
        const r = await json(`${api}/attributes`, 'POST', { name: nome, value: 1, defaultDie: adicionar.dado, description: adicionar.descricao })
        const a = r?.ok ? await r.json().catch(() => null) as { id: string } | null : null
        if (a) setAttrs(xs => [...xs, { id: a.id, n: nome, desc: adicionar.descricao, v: 1, die: adicionar.dado }])
      },
      groups: p.grupos.map(g => ({
        l: g.l ?? '', hasL: !!g.l,
        rows: pega(g.sel).map(a => {
          usados.add(a.id)
          const pool = spec.familia === 'dots'
          if (p.prof) {
            const nomes = ['Destreinado', 'Treinado', 'Especialista', 'Mestre', 'Lendário']
            const rank = Math.max(0, Math.min(p.prof.length - 1, a.v)), b = rank ? d.nivel + 2 * rank : 0
            return R({ n: a.n, hasSeg: true, seg: p.prof.map((l, i) => ({ l, t: nomes[i] ?? l, bg: i === rank ? 'var(--ink)' : 'transparent', color: i === rank ? 'var(--bg)' : 'var(--muted)', sh: 'none', go: () => salvaAttr(a.id, i) })), hasRoll: true, rollL: sg(b), roll: () => rolar(a.n, b) })
          }
          return p.bolinhas
            ? R({ n: a.n, hasDots: true, dots: dots(a.id, a.v, nBol(p.bolinhas)), hasRoll: true, rollL: pool ? `${a.v}d10` : sg(a.v), roll: () => rolar(a.n, a.v) })
            : R({ n: a.n, hasIn: true, inV: String(a.v), onIn: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const v = parseInt((e.target.value.match(/-?\d+/) ?? ['0'])[0], 10); if (!isNaN(v)) salvaAttr(a.id, v) }, hasRoll: true, rollL: 'rolar', roll: () => rolar(a.n, a.v) })
        }),
      })),
    })]
  }

  // ── Moldura ──
  const A = spec.atributos
  const dotGroups = A.tipo === 'bolinhas' ? A.grupos.map(g => ({ l: g.l, rows: pega(g.sel).map(a => ({ n: a.n, roll: () => rolar(a.n, a.v), dots: Array.from({ length: nBol(A.max) }, (_, i) => ({ t: `${a.n} ${i + 1}`, bg: i < a.v ? 'var(--accent)' : 'transparent', go: () => salvaAttr(a.id, a.v === i + 1 ? i : i + 1) })) })) })) : []
  const tiles = A.tipo === 'tiles' ? pega(A.sel).map(a => {
    const m = Math.floor((a.v - 10) / 2)
    const big = A.mostra === 'mod' ? sg(m) : A.mostra === 'dado' ? `d${a.v}` : A.mostra === 'sinal' ? sg(a.v) : String(a.v)
    const small = A.mostra === 'mod' ? String(a.v) : A.mostra === 'pct' ? (spec.regra === 'coc' ? `½ ${Math.floor(a.v / 2)} · ⅕ ${Math.floor(a.v / 5)}` : '%') : A.mostra === 'dado' ? 'clique para rolar' : spec.regra === 'gurps' ? `3d6 ≤ ${a.v}` : 'rolar'
    return { n: a.n, big, small, go: () => rolar(A.mostra === 'mod' ? `Teste de ${a.n}` : a.n, A.mostra === 'mod' ? m : a.v) }
  }) : []
  // Atributos que nenhum grupo do spec cobre (ex.: criados à mão) não somem: vão para a aba "Outros".
  const sels: Sel[] = [
    ...(A.tipo === 'bolinhas' ? A.grupos.map(g => g.sel) : [A.sel]),
    ...spec.secoes.flatMap(s => s.pecas.flatMap(p => p.tipo === 'linhas' ? p.grupos.map(g => g.sel) : [])),
    { nomes: [...spec.trilhas, ...spec.secoes.flatMap(s => s.pecas.flatMap(p => p.tipo === 'trilhas' ? p.trilhas : []))].flatMap(t => [...('fonte' in t && 'attr' in t.fonte ? t.fonte.attr : []), ...('max' in t && typeof t.max === 'object' && 'attr' in t.max ? t.max.attr : [])]).concat(spec.pilulas.flatMap(p => p.attr ?? [])) },
    ...spec.pilulas.flatMap(p => p.sel ? [p.sel] : []),
  ]
  const naoUsados = attrs.filter(a => !sels.some(s => s.nomes?.some(n => n.toLowerCase() === a.n.toLowerCase()) || s.prefixo?.some(p => a.desc.startsWith(p))))
  const secoes = [...spec.secoes, ...(naoUsados.length ? [{ n: 'Outros', pecas: [{ tipo: 'linhas' as const, grupos: [{ sel: { nomes: naoUsados.map(a => a.n) } }] }] }] : [])]
  const atual = secoes[Math.min(aba, secoes.length - 1)]
  const linha = spec.linha.map(k => tf[k]).filter(Boolean).join(' · ')
  return {
    voltarHref: d.voltarHref, sysName: d.sistema, campanha: d.campanha, charName: d.nome, charLine: linha || '—', ini: (d.nome[0] ?? '?').toUpperCase(), img: d.img,
    leather: LEATHER[spec.familia]!, famIcon: ICONE[spec.familia],
    pills: spec.pilulas.flatMap(p => p.sel ? pega(p.sel).map(a => ({ l: a.n, v: String(a.v) })) : [{ l: p.l ?? '', v: p.tf ? (tf[p.tf] || '—') : p.attr ? String(attr(p.attr)?.v ?? '—') : '—' }]),
    attrTitle: 'Atributos', ruleLine: RULE[spec.regra], useDots: A.tipo === 'bolinhas', useTiles: A.tipo === 'tiles', dotGroups, tiles,
    tracks: [...(d.temPv && spec.familia !== 'dots' && !spec.semPvFicha ? [trilha({ n: 'Pontos de vida', forma: 'bar', fonte: { pv: true }, max: { pv: true } }, true)] : []), ...spec.trilhas.map(t => trilha(t, true))],
    abas: secoes.map((s, i) => ({ l: s.n, on: s === atual, go: () => setAba(i), color: s === atual ? 'var(--ink)' : 'var(--muted)', line: s === atual ? 'inset 0 -2px 0 var(--accent)' : 'none' })),
    secao: atual ? atual.pecas.flatMap(peca) : [],
    podeEditar: ed, publicaHref: d.publicaHref,
    toasts,
  }
}

export type FichaSistemaVals = ReturnType<typeof useFichaSistema>
