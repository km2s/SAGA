'use client'

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Castle, Eye, Feather, Flame, Moon, Skull, Sparkles, Swords, type LucideIcon } from 'lucide-react'
import { dcHref } from '@/lib/dc-routes'
import { safeImageUrl } from '@/lib/safe-url'

/**
 * Porte do renderVals() de SAGA Criar Sistema.dc.html. Começa em branco (o
 * design vem com um exemplo preenchido) e grava o sistema e os atributos pela
 * API atual. Rascunho fica no navegador.
 */

const LEATHER = ['linear-gradient(150deg,#7a4a14,#4a2a08 60%,#2a1804)', 'linear-gradient(150deg,#5a1a2e,#36101c 60%,#1c080e)', 'linear-gradient(150deg,#6a1414,#3e0a0a 60%,#1e0505)', 'linear-gradient(150deg,#1e4a4a,#123030 60%,#081a1a)', 'linear-gradient(150deg,#2a3a5a,#18223a 60%,#0a1020)']
const ICONS: LucideIcon[] = [Feather, Swords, Flame, Moon, Eye, Skull, Castle, Sparkles]
const RES_C = ['#6a9a4a', '#3a6a7a', '#6b5a8a', '#b8492a', '#c9a22a']
const CATS = ['Fantasia', 'Horror', 'Mundo das Trevas', 'Sci-Fi', 'Genérico']
const LEATHER_BY_CAT: Record<string, number> = { 'Fantasia': 0, 'Mundo das Trevas': 1, 'Horror': 2, 'Sci-Fi': 3, 'Genérico': 4 }
const CAT_DB: Record<string, string> = { 'Fantasia': 'fantasy', 'Horror': 'horror', 'Mundo das Trevas': 'world-of-darkness', 'Sci-Fi': 'scifi', 'Genérico': 'generic' }
const ROM = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
const DRAFT = 'saga_sistema_rascunho'

type Attr = { id: number; n: string; a: string; min: number; max: number }
type Res = { id: number; n: string; f: string; c: number }
type Draft = { img: string; src: string[]; name: string; desc: string; cat: string; leather: number; icon: number; die: string; mech: string; diff: number; crit: string; attrs: Attr[]; res: Res[]; skills: { id: number; n: string }[]; vis: string; clone: boolean; imp: boolean; nid: number }
const INICIAL: Draft = {
  img: '', src: [], name: '', desc: '', cat: 'Fantasia', leather: 0, icon: 0, die: 'd20', mech: 'sum', diff: 6, crit: 'Natural máximo',
  attrs: ([['Força', 'FOR'], ['Destreza', 'DES'], ['Constituição', 'CON'], ['Inteligência', 'INT'], ['Sabedoria', 'SAB'], ['Carisma', 'CAR']] as const).map(([n, a], i) => ({ id: i, n, a, min: 1, max: 20 })),
  res: [{ id: 50, n: 'Pontos de vida', f: 'CON × 2 + 10', c: 0 }],
  skills: [], vis: 'Só minhas mesas', clone: true, imp: false, nid: 100,
}

/** Sistemas de onde copiar atributos (pré-definidos e os do usuário). */
export type Fonte = { id: string; n: string; attrs: string[] }

export function useCriarSistemaVals(fontes: Fonte[] = []) {
  const router = useRouter()
  const [s, setS] = useState<Draft>(INICIAL)
  const [skDraft, setSkDraft] = useState('')
  const [fresh, setFresh] = useState<number | null>(null)
  const [test, setTest] = useState<{ label: string; detail: string; total: number | string; color: string } | null>(null)
  const [testTick, setTestTick] = useState(0)
  const [saved, setSaved] = useState(false)
  const [sealing, setSealing] = useState(false)
  const [doneId, setDoneId] = useState<string | null>(null)
  const t1 = useRef<ReturnType<typeof setTimeout>>()

  // Rascunho salvo no navegador (botão "Salvar rascunho").
  useEffect(() => {
    try { const raw = localStorage.getItem(DRAFT); if (raw) { setS({ ...INICIAL, ...JSON.parse(raw) as Draft }); setSaved(true) } } catch { /* sem rascunho */ }
    return () => clearTimeout(t1.current)
  }, [])

  const set = (p: Partial<Draft>) => { setS(x => ({ ...x, ...p })); setSaved(false) }
  const upd = <K extends 'attrs' | 'res'>(key: K, id: number, patch: Partial<Draft[K][number]>) =>
    set({ [key]: (s[key] as Draft[K]).map(x => (x.id === id ? { ...x, ...patch } : x)) } as Partial<Draft>)
  const nextId = () => { const id = s.nid; return id }

  const testRoll = (a: Attr, v: number) => {
    const sides = s.die === 'd100' ? 100 : s.die === '4dF' ? 3 : +s.die.replace(/\D/g, '').slice(-2) || 20, two = s.die === '2d6'
    const r = (d: number) => 1 + Math.floor(Math.random() * d)
    let detail: string, total: number, good: boolean
    if (s.mech === 'pool') { const n = Math.max(1, v), dd = two ? 6 : sides, rolls = Array.from({ length: n }, () => r(dd)); total = rolls.filter(x => x >= s.diff).length; detail = `${n}d${dd} dif. ${s.diff} · [${rolls.join(', ')}]`; good = total > 0 }
    else if (s.mech === 'under') { const x = r(100); total = x; detail = `1d100 ≤ ${v} · ${x <= v ? 'sucesso' : 'falha'}`; good = x <= v }
    else if (s.die === '4dF') { const rolls = Array.from({ length: 4 }, () => r(3) - 2), m = Math.floor((v - 10) / 2); total = rolls.reduce((p, q) => p + q, 0) + m; detail = `4dF${m >= 0 ? '+' : ''}${m} · [${rolls.map(x => (x > 0 ? '+' : x < 0 ? '−' : '0')).join(' ')}]`; good = total > 0 }
    else { const m = Math.floor((v - (a.max <= 6 ? 3 : 10)) / 2), rolls = two ? [r(6), r(6)] : [r(sides)]; total = rolls.reduce((p, q) => p + q, 0) + m; detail = `${two ? '2d6' : `1${s.die}`}${m >= 0 ? '+' : ''}${m} · [${rolls.join(', ')}]`; good = !two && rolls[0] === sides }
    setTestTick(n => n + 1); setTest({ label: `Teste de ${a.n || a.a}`, detail, total, color: good ? '#f3dc94' : '#f1e3c2' })
  }

  // Siglas repetidas ou faixa invertida não deixam publicar (SAGA Criar Sistema Extras).
  const sgs = s.attrs.map(a => a.a.trim()).filter(Boolean)
  const attrErr = sgs.some((x, i) => sgs.indexOf(x) !== i) ? 'Duas siglas iguais: troque uma delas.' : s.attrs.some(a => a.min >= a.max) ? 'O mínimo precisa ser menor que o máximo.' : ''
  const capaUrl = s.img.trim().startsWith('https://') ? safeImageUrl(s.img.trim()) : null, imgOk = !!capaUrl

  const publish = async () => {
    if (!s.name.trim() || sealing) return
    if (attrErr) { setTestTick(n => n + 1); setTest({ label: 'Atributos', detail: attrErr, total: '!', color: '#e8a080' }); return }
    if (s.img.trim() && !imgOk) { setTestTick(n => n + 1); setTest({ label: 'Capa', detail: 'Use um endereço https:// para a imagem da capa.', total: '!', color: '#e8a080' }); return }
    setSealing(true)
    const espera = new Promise(res => setTimeout(res, 900))
    const r = await fetch('/api/systems', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: s.name.trim(), description: s.desc.trim() || undefined, category: CAT_DB[s.cat] ?? 'custom',
        imageUrl: capaUrl ?? undefined, copyFromSystemIds: s.src,
        dadoBase: s.die, mecanica: s.mech, dificuldade: s.diff, critico: s.crit, couro: s.leather, icone: s.icon,
        recursos: s.res.map(x => ({ nome: x.n, formula: x.f, cor: RES_C[x.c % RES_C.length] })), visibilidade: s.vis, permitirClonar: s.clone, permitirImportadas: s.imp,
      }),
    }).catch(() => null)
    const sys = r?.ok ? await r.json().catch(() => null) as { id?: string } | null : null
    if (sys?.id) {
      // Atributos e perícias viram atributos da ficha (como nos pré-definidos).
      const die = s.mech === 'under' ? 'd100' : s.mech === 'pool' ? 'd10' : s.die
      await Promise.all([
        ...s.attrs.filter(a => a.n.trim()).map((a, i) => fetch(`/api/systems/${sys.id}/attributes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: a.n.trim(), defaultDie: die, sigla: a.a, minimo: a.min, maximo: a.max, tipo: 'atributo', order: i }) }).catch(() => null)),
        ...s.skills.map((k, i) => fetch(`/api/systems/${sys.id}/attributes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: k.n, defaultDie: die, tipo: 'pericia', minimo: 0, maximo: 10, order: 100 + i }) }).catch(() => null)),
      ])
      try { localStorage.removeItem(DRAFT) } catch { /* sem localStorage */ }
    }
    await espera
    setSealing(false)
    if (sys?.id) { setDoneId(sys.id); setSaved(true); router.refresh() }
  }

  const seg = (arr: string[], cur: string, go: (k: string) => void) => arr.map(l => {
    const on = cur === l
    return { l, go: () => go(l), bg: on ? 'var(--surface)' : 'transparent', color: on ? 'var(--ink)' : 'var(--muted)', sh: on ? '0 1px 2px rgb(0 0 0/.1)' : 'none' }
  })
  const chip = (arr: string[], isOn: (k: string) => boolean, tap: (k: string) => void) => arr.map(k => {
    const on = isOn(k)
    return { l: k, go: () => tap(k), bg: on ? 'var(--ink)' : 'var(--surface)', color: on ? 'var(--bg)' : 'var(--ink)', ring: on ? 'var(--ink)' : 'var(--line)' }
  })
  const sw = (on: boolean, go: () => void) => ({ track: on ? 'var(--accent)' : 'var(--line)', knob: on ? '21px' : '3px', go })
  const MECH: Record<string, [string, string, string]> = {
    sum: ['Soma + modificador', `1${s.die === '2d6' ? '2d6' : s.die} + mod ≥ CD`, 'Rola e compara com uma dificuldade.'],
    pool: ['Parada de sucessos', `Xd10 · cada ≥ ${s.diff}`, 'O atributo diz quantos dados; conta os sucessos.'],
    under: ['Rolar abaixo', '1d100 ≤ valor', 'Sucesso se o resultado ficar abaixo do atributo.'],
  }
  const pvVal = (a: Attr) => (s.mech === 'under' ? Math.round(a.max * 0.55) : Math.round(a.min + (a.max - a.min) * 0.6))
  const fmtMod = (a: Attr, v: number) => (s.mech === 'pool' ? `${v}d10` : s.mech === 'under' ? `${v}%` : (() => { const m = Math.floor((v - (a.max <= 6 ? 3 : 10)) / 2); return (m >= 0 ? '+' : '') + m })())
  const Icone = ICONS[s.icon]

  // Começar a partir de outros sistemas: quantos atributos novos entram (repetidos pelo nome entram uma vez).
  const tem = new Set(s.attrs.map(a => a.n.trim().toLowerCase()))
  const vindo = Array.from(new Set(fontes.filter(f => s.src.includes(f.id)).flatMap(f => f.attrs)))
  const novos = vindo.filter(n => !tem.has(n.toLowerCase()))

  return {
    $href: (link: string) => dcHref(link),
    img: s.img, onImg: (e: ChangeEvent<HTMLInputElement>) => set({ img: e.target.value.slice(0, 500) }),
    srcs: fontes.map(f => { const on = s.src.includes(f.id); return { l: f.n, on, go: () => set({ src: on ? s.src.filter(x => x !== f.id) : [...s.src, f.id].slice(0, 5) }), bg: on ? 'var(--ink)' : 'var(--surface)', color: on ? 'var(--bg)' : 'var(--ink)', ring: on ? 'var(--ink)' : 'var(--line)' } }),
    hasSrc: s.src.length > 0,
    srcLine: novos.length ? `Na criação entram mais ${novos.length}: ${novos.slice(0, 8).join(', ')}${novos.length > 8 ? '…' : ''}. Os outros ${vindo.length - novos.length} já existem.` : `Todos os ${vindo.length} atributos desses sistemas já estão na lista.`,
    name: s.name, onName: (e: ChangeEvent<HTMLInputElement>) => set({ name: e.target.value }), nameCount: `${s.name.length}/40`, nameShow: s.name.trim() || 'Sem título',
    desc: s.desc, onDesc: (e: ChangeEvent<HTMLTextAreaElement>) => set({ desc: e.target.value }), descCount: `${s.desc.length}/180`,
    cats: chip(CATS, k => s.cat === k, k => set({ cat: k, leather: LEATHER_BY_CAT[k] })),
    leathers: LEATHER.map((bg, i) => ({ bg, go: () => set({ leather: i }), ring: s.leather === i ? '0 0 0 2px var(--surface), 0 0 0 4px var(--accent)' : '2px 0 0 #e6d5ac' })),
    icons: ICONS.map((icon, i) => ({ icon, go: () => set({ icon: i }), bg: s.icon === i ? 'var(--ink)' : 'var(--surface)', color: s.icon === i ? 'var(--bg)' : 'var(--ink)', ring: s.icon === i ? 'var(--ink)' : 'var(--line)' })),
    dice: seg(['d6', 'd10', 'd12', 'd20', 'd100', '2d6', '4dF'], s.die, k => set({ die: k, mech: k === 'd100' ? 'under' : k === 'd10' && s.mech === 'under' ? 'pool' : s.mech === 'under' && k !== 'd100' ? 'sum' : s.mech })),
    mechs: Object.keys(MECH).map(k => {
      const on = s.mech === k
      return { t: MECH[k][0], f: MECH[k][1], d: MECH[k][2], go: () => set({ mech: k, die: k === 'under' ? 'd100' : k === 'pool' ? 'd10' : s.die === 'd100' ? 'd20' : s.die }), bg: on ? 'var(--accent-t)' : 'var(--surface)', rw: on ? '2px' : '1px', ring: on ? 'var(--accent)' : 'var(--line)' }
    }),
    isPool: s.mech === 'pool', diff: s.diff, onDiff: (e: ChangeEvent<HTMLInputElement>) => set({ diff: +e.target.value }), diffLabel: `≥ ${s.diff}`,
    crits: seg(['Natural máximo', 'Dobro de sucessos', 'Sem crítico'], s.crit, k => set({ crit: k })),
    attrs: s.attrs.map((a, i) => ({
      ...a, num: ROM[i] ?? i + 1, anim: a.id === fresh ? 'criarsistema-rowIn .3s both' : 'none',
      onN: (e: ChangeEvent<HTMLInputElement>) => upd('attrs', a.id, { n: e.target.value }), onA: (e: ChangeEvent<HTMLInputElement>) => upd('attrs', a.id, { a: e.target.value.toUpperCase().slice(0, 4) }),
      onMin: (e: ChangeEvent<HTMLInputElement>) => upd('attrs', a.id, { min: +e.target.value }), onMax: (e: ChangeEvent<HTMLInputElement>) => upd('attrs', a.id, { max: +e.target.value }),
      up: () => { if (!i) return; const x = [...s.attrs];[x[i - 1], x[i]] = [x[i], x[i - 1]]; set({ attrs: x }) },
      rm: () => { if (s.attrs.length > 1) set({ attrs: s.attrs.filter(y => y.id !== a.id) }) },
    })),
    addAttr: () => { const id = nextId(); set({ attrs: [...s.attrs, { id, n: 'Novo atributo', a: 'NOV', min: 1, max: 20 }], nid: id + 1 }); setFresh(id) },
    res: s.res.map(r => ({
      ...r, c: RES_C[r.c % RES_C.length], anim: r.id === fresh ? 'criarsistema-rowIn .3s both' : 'none',
      cycle: () => upd('res', r.id, { c: r.c + 1 }), onN: (e: ChangeEvent<HTMLInputElement>) => upd('res', r.id, { n: e.target.value }), onF: (e: ChangeEvent<HTMLInputElement>) => upd('res', r.id, { f: e.target.value }),
      rm: () => set({ res: s.res.filter(x => x.id !== r.id) }),
    })),
    addRes: () => { const id = nextId(); set({ res: [...s.res, { id, n: 'Sanidade', f: 'SAB × 5', c: 2 }], nid: id + 1 }); setFresh(id) },
    skills: s.skills.map(k => ({ n: k.n, anim: k.id === fresh ? 'criarsistema-rowIn .3s both' : 'none', rm: () => set({ skills: s.skills.filter(x => x.id !== k.id) }) })),
    skDraft, onSk: (e: ChangeEvent<HTMLInputElement>) => setSkDraft(e.target.value),
    onSkKey: (e: KeyboardEvent) => { if (e.key === 'Enter' && skDraft.trim()) { const id = nextId(); set({ skills: [...s.skills, { id, n: skDraft.trim() }], nid: id + 1 }); setSkDraft(''); setFresh(id) } },
    visOpts: seg(['Privado', 'Só minhas mesas', 'Comunidade'], s.vis, k => set({ vis: k })),
    swClone: sw(s.clone, () => set({ clone: !s.clone })), swImport: sw(s.imp, () => set({ imp: !s.imp })),
    leather: capaUrl ? `url(${JSON.stringify(capaUrl)}) center/cover, ${LEATHER[s.leather]}` : LEATHER[s.leather], iconUrl: Icone, catLabel: s.cat, visLabel: s.vis, ribbonOp: s.vis === 'Comunidade' ? 1 : 0,
    summary: `${s.attrs.length} atributos · ${s.res.length} recursos · ${s.skills.length} perícias · ${MECH[s.mech][0].toLowerCase()} (${s.die})`,
    pvAttrs: s.attrs.slice(0, 9).map(a => { const v = pvVal(a); return { a: a.a || '—', v, m: fmtMod(a, v), anim: a.id === fresh ? 'criarsistema-popA .35s' : 'none', go: () => testRoll(a, s.mech === 'pool' ? Math.max(1, Math.round(v / 4)) : v) } }),
    pvRes: s.res.map(r => ({ n: r.n, f: r.f, c: RES_C[r.c % RES_C.length] })),
    test: test ?? { label: 'Teste de rolagem', detail: 'Clique num atributo da ficha', total: '—', color: '#bba98a' },
    testAnim: testTick ? `${testTick % 2 ? 'criarsistema-spin' : 'criarsistema-spinB'} .7s cubic-bezier(.2,.7,.3,1) both` : 'none',
    draftDot: saved ? 'var(--ok)' : 'var(--gold)', draftLabel: saved ? 'Rascunho salvo agora mesmo' : 'Alterações não salvas',
    discard: () => { try { localStorage.removeItem(DRAFT) } catch { /* sem localStorage */ } router.push('/sistemas') },
    saveDraft: () => { try { localStorage.setItem(DRAFT, JSON.stringify(s)) } catch { /* sem localStorage */ } setSaved(true) },
    publishLabel: s.vis === 'Comunidade' ? 'Publicar na comunidade' : 'Salvar sistema',
    publish: () => void publish(),
    isSealing: sealing, done: !!doneId, doneKick: s.vis === 'Comunidade' ? 'Publicado na biblioteca da comunidade' : 'Guardado em Meus sistemas',
  }
}

export type Vals = ReturnType<typeof useCriarSistemaVals>
