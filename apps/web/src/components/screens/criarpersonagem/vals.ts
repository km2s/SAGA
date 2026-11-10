'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Flame, KeyRound, Music, Shield, Sun, Swords, Trees, WandSparkles, type LucideIcon } from 'lucide-react'
import { dcHref } from '@/lib/dc-routes'

/** Porte do renderVals() de SAGA Criar Personagem.dc.html (assistente de D&D 5e). */

/** Campanhas onde dá para criar (app/(app)/personagens/novo/page.tsx). */
export type CriarPersonagemDados = {
  jogador: { id: string; t: string; d: string; sistema: string | null }[]
  npc: { id: string; t: string; d: string; sistema: string | null }[]
  modo: 'jogador' | 'npc'
  campanhaInicial: string | null
}

const K = ['FOR', 'DES', 'CON', 'INT', 'SAB', 'CAR']
// Nomes dos atributos no D&D 5e do seed (lib/systems-seed.ts).
const NOME: Record<string, string> = { FOR: 'Força', DES: 'Destreza', CON: 'Constituição', INT: 'Inteligência', SAB: 'Sabedoria', CAR: 'Carisma' }
const RACES: [string, Partial<Record<string, number>>, string, string][] = [['Humano', { FOR: 1, DES: 1, CON: 1, INT: 1, SAB: 1, CAR: 1 }, '+1 em todos', '9 m'], ['Elfo', { DES: 2, INT: 1 }, '+2 DES · +1 INT', '9 m · visão no escuro'], ['Anão', { CON: 2, SAB: 1 }, '+2 CON · +1 SAB', '7,5 m · resistência'], ['Halfling', { DES: 2, CAR: 1 }, '+2 DES · +1 CAR', '7,5 m · sortudo'], ['Meio-elfo', { CAR: 2, DES: 1, INT: 1 }, '+2 CAR · +1 DES · +1 INT', '9 m · feérico'], ['Gnomo', { INT: 2, CON: 1 }, '+2 INT · +1 CON', '7,5 m · astúcia'], ['Draconato', { FOR: 2, CAR: 1 }, '+2 FOR · +1 CAR', '9 m · sopro'], ['Tiefling', { CAR: 2, INT: 1 }, '+2 CAR · +1 INT', '9 m · infernal']]
const CLASSES: [string, LucideIcon, number, string[], string[]][] = [['Guerreiro', Swords, 10, ['FOR', 'CON'], ['Atletismo', 'Percepção']], ['Ladino', KeyRound, 8, ['DES', 'INT'], ['Furtividade', 'Acrobacia', 'Prestidigitação', 'Percepção']], ['Mago', WandSparkles, 6, ['INT', 'SAB'], ['Arcanismo', 'História']], ['Clérigo', Sun, 8, ['SAB', 'CAR'], ['Religião', 'Intuição']], ['Paladino', Shield, 10, ['SAB', 'CAR'], ['Atletismo', 'Persuasão']], ['Bardo', Music, 8, ['DES', 'CAR'], ['Atuação', 'Persuasão', 'Enganação']], ['Patrulheiro', Trees, 10, ['FOR', 'DES'], ['Sobrevivência', 'Natureza', 'Percepção']], ['Bruxo', Flame, 8, ['SAB', 'CAR'], ['Arcanismo', 'Intimidação']]]
const BGS: [string, string[]][] = [['Acólito', ['Intuição', 'Religião']], ['Criminoso', ['Enganação', 'Furtividade']], ['Nobre', ['História', 'Persuasão']], ['Sábio', ['Arcanismo', 'História']], ['Soldado', ['Atletismo', 'Intimidação']], ['Forasteiro', ['Atletismo', 'Sobrevivência']], ['Artista', ['Acrobacia', 'Atuação']], ['Eremita', ['Medicina', 'Religião']]]
const COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 }
const NPCC: Record<string, string> = { 'Vilão': '#8a1c24', 'Aliado': '#4f7a3a', 'Mercador': '#b98a2a', 'Familiar': '#6b5a8a', 'Neutro': '#76695a' }
const NPC_TIPO: Record<string, string> = { 'Vilão': 'VILLAIN', 'Aliado': 'ALLY', 'Mercador': 'MERCHANT', 'Familiar': 'FAMILIAR', 'Neutro': 'NEUTRAL' }
const ALIGN: [string, string][] = [['LB', 'Leal e Bom'], ['NB', 'Neutro e Bom'], ['CB', 'Caótico e Bom'], ['LN', 'Leal e Neutro'], ['N', 'Neutro'], ['CN', 'Caótico e Neutro'], ['LM', 'Leal e Mau'], ['NM', 'Neutro e Mau'], ['CM', 'Caótico e Mau']]
const STEPS: [string, string][] = [['Origem', 'Campanha e nível'], ['Ancestralidade', 'Raça e classe'], ['Atributos', 'Dados ou pontos'], ['Detalhes', 'Nome e passado'], ['Revisão', 'Antes de selar']]
const R = ['I', 'II', 'III', 'IV', 'V']
const CAMP_COV = ['linear-gradient(135deg,#2a1c08,#c9a22a)', 'linear-gradient(135deg,#1a120c,#5c4410)', 'linear-gradient(135deg,#3a2a1c,#6a5a3a)']
const PCOL = ['linear-gradient(160deg,#8f3a24,#3a1a10)', 'linear-gradient(160deg,#5c4410,#2a1c08)']
const PADRAO = [15, 14, 13, 12, 10, 8]
const mod = (v: number) => Math.floor((v - 10) / 2), sg = (v: number) => (v >= 0 ? '+' : '') + v

const json = (url: string, body: unknown) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null)

export function useCriarPersonagemVals(d: CriarPersonagemDados) {
  const router = useRouter()
  const [mode, setMode] = useState(d.modo)
  const lista = mode === 'npc' ? d.npc : d.jogador
  const [camp, setCamp] = useState(() => Math.max(0, (d.modo === 'npc' ? d.npc : d.jogador).findIndex(c => c.id === d.campanhaInicial)))
  const [step, setStep] = useState(0)
  const [maxStep, setMaxStep] = useState(0)
  const [npcType, setNpcType] = useState('Vilão')
  const [vis, setVis] = useState(false)
  const [lvl, setLvl] = useState(1)
  const [race, setRace] = useState<number | null>(null)
  const [cls, setCls] = useState<number | null>(null)
  const [method, setMethod] = useState('padrao')
  const [vals, setVals] = useState(PADRAO)
  const [buy, setBuy] = useState([8, 8, 8, 8, 8, 8])
  const [sel, setSel] = useState<number | null>(null)
  const [tick, setTick] = useState(0)
  const [sets, setSets] = useState<number[][] | null>(null)
  const [rolling, setRolling] = useState(false)
  const [name, setName] = useState('')
  const [bg, setBg] = useState('Acólito')
  const [align, setAlign] = useState('NB')
  const [story, setStory] = useState('')
  const [secret, setSecret] = useState('')
  const [err, setErr] = useState('')
  const [shake, setShake] = useState(0)
  const [sealing, setSealing] = useState(false)
  const [doneHref, setDoneHref] = useState<string | null>(null)
  const iv = useRef<ReturnType<typeof setInterval>>()
  const t1 = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => () => { clearInterval(iv.current); clearTimeout(t1.current) }, [])

  const npc = mode === 'npc'
  const fail = (e: string) => { setErr(e); setShake(n => n + 1) }
  const rc = race != null ? RACES[race] : null, cl = cls != null ? CLASSES[cls] : null
  const base = method === 'pontos' ? buy : vals
  const spent = buy.reduce((a, v) => a + COST[v], 0), left = 27 - spent
  const totals = K.map((k, i) => base[i] + (rc?.[1][k] ?? 0))
  const hd = cl ? cl[2] : 8, con = mod(totals[2]), des = mod(totals[1])
  const hp = Math.max(1, hd + con + (lvl - 1) * (hd / 2 + 1 + con)), prof = 2 + Math.floor((lvl - 1) / 4)
  const campanha = lista[camp] ?? null
  const bgD = BGS.find(b => b[0] === bg) ?? BGS[0]
  const nm = name.trim()

  const rollAll = () => {
    if (rolling) return
    const d6 = () => 1 + Math.floor(Math.random() * 6), mk = () => Array.from({ length: 6 }, () => [d6(), d6(), d6(), d6()])
    setRolling(true); setSets(mk())
    clearInterval(iv.current); iv.current = setInterval(() => setSets(mk()), 70)
    t1.current = setTimeout(() => {
      clearInterval(iv.current)
      const s = mk()
      setRolling(false); setSets(s); setVals(s.map(r => r.reduce((a, b) => a + b, 0) - Math.min(...r))); setTick(n => n + 1); setSel(null)
    }, 1000)
  }

  const salvar = async () => {
    if (!campanha) return fail(npc ? 'Escolha uma campanha sua.' : 'Entre numa campanha para criar um personagem.')
    setSealing(true); setErr('')
    const espera = new Promise(r => setTimeout(r, 900))
    let href: string | null = null
    if (npc) {
      const r = await json(`/api/campaigns/${campanha.id}/npcs`, { name: nm, type: NPC_TIPO[npcType], race: rc?.[0], class: cl?.[0], level: lvl, hp, maxHp: hp, isPublic: vis, description: story.trim() || undefined })
      const n = r?.ok ? await r.json().catch(() => null) as { id?: string } | null : null
      if (n?.id) href = `/campaign/${campanha.id}?aba=npcs`
    } else {
      const r = await json('/api/characters', {
        campaignId: campanha.id, name: nm, race: rc?.[0], class: cl?.[0], level: lvl, hp, maxHp: hp,
        atributos: K.map((k, i) => ({ nome: NOME[k], valor: totals[i] })),
      })
      const ch = r?.ok ? await r.json().catch(() => null) as { id?: string } | null : null
      if (ch?.id) {
        href = `/personagens/${ch.id}`
        // História, antecedente e alinhamento como campos de texto da ficha.
        // O segredo vai num campo de texto: só o dono e o mestre leem (a ficha pública não carrega campos de texto).
        await Promise.all([
          json(`/api/characters/${ch.id}/text-fields`, { key: 'antecedente', label: 'Antecedente', value: bg, order: 0 }),
          json(`/api/characters/${ch.id}/text-fields`, { key: 'alinhamento', label: 'Alinhamento', value: ALIGN.find(a => a[0] === align)?.[1] ?? align, order: 1 }),
          story.trim() ? json(`/api/characters/${ch.id}/text-fields`, { key: 'historia', label: 'História', value: story.trim(), order: 2 }) : null,
          secret.trim() ? json(`/api/characters/${ch.id}/text-fields`, { key: 'segredos', label: 'Segredos (só o mestre vê)', value: secret.trim(), order: 3 }) : null,
        ])
      } else if (r?.status === 409) {
        await espera; setSealing(false); return fail('Você já tem um personagem nesta campanha.')
      }
    }
    await espera
    setSealing(false)
    if (href) { setDoneHref(href); router.refresh() } else fail('Não foi possível concluir agora. Tente de novo.')
  }

  const next = () => {
    if (step === 0 && !campanha) return fail(npc ? 'Escolha uma campanha sua.' : 'Entre numa campanha para criar um personagem.')
    if (step === 1 && (race == null || cls == null)) return fail(race == null ? 'Escolha uma ancestralidade.' : 'Escolha uma classe.')
    if (step === 2 && method === 'rolar' && !sets) return fail('Role os dados primeiro.')
    if (step === 3 && !nm) return fail('Todo herói precisa de um nome.')
    if (step === 4) { if (!sealing) void salvar(); return }
    setStep(step + 1); setMaxStep(Math.max(maxStep, step + 1)); setErr('')
  }

  const seg = (arr: [string, string][], cur: string, set: (k: string) => void) => arr.map(([k, l]) => {
    const on = cur === k
    return { l, go: () => set(k), bg: on ? 'var(--surface)' : 'transparent', color: on ? 'var(--ink)' : 'var(--muted)', sh: on ? '0 1px 2px rgb(0 0 0/.1)' : 'none' }
  })
  const chip = (arr: string[], isOn: (k: string) => boolean, tap: (k: string) => void) => arr.map(k => {
    const on = isOn(k)
    return { l: k, go: () => tap(k), bg: on ? 'var(--ink)' : 'var(--surface)', color: on ? 'var(--bg)' : 'var(--ink)', ring: on ? 'var(--ink)' : 'var(--line)' }
  })
  const lowest = (r: number[]) => r.indexOf(Math.min(...r))
  const sysNome = campanha?.sistema ?? null

  return {
    $href: (link: string) => dcHref(link),
    $img: (_id: string): string | null => null, // TODO(api): retrato no momento da criação
    kickText: npc ? 'Painel do mestre' : 'Novo aventureiro', titleText: npc ? 'Criar NPC' : 'Criar personagem',
    modes: seg([['jogador', 'Personagem de jogador'], ['npc', 'NPC']], mode, k => { setMode(k as 'jogador' | 'npc'); setCamp(0) }),
    isNpc: npc, stepN: step + 1, s1: step === 0, s2: step === 1, s3: step === 2, s4: step === 3, s5: step === 4,
    steps: STEPS.map(([t, dd], i) => {
      const cur = i === step, done = i < maxStep && !cur, ok = i <= maxStep
      return { t, d: dd, num: done ? '✓' : R[i], cur: ok ? 'pointer' : 'default', op: ok ? 1 : 0.5, bg: cur ? 'var(--surface)' : 'transparent', ring: cur || done ? 'var(--accent)' : 'var(--line)', ib: done ? 'var(--accent)' : cur ? 'var(--accent-t)' : 'transparent', ic: done ? '#fff8f0' : cur ? 'var(--accent)' : 'var(--muted)', go: () => { if (ok) { setStep(i); setErr('') } } }
    }),
    campLabel: 'Campanha',
    camps: lista.map((c, i) => {
      const on = camp === i
      return { t: c.t, d: c.d, cover: CAMP_COV[i % CAMP_COV.length], go: () => setCamp(i), bg: on ? 'var(--accent-t)' : 'var(--surface)', rw: on ? '2px' : '1px', ring: on ? 'var(--accent)' : 'var(--line)' }
    }),
    sistemaNome: sysNome ?? 'Sistema próprio',
    sistemaLinha: sysNome === 'D&D 5e' ? 'Livro do Jogador · ficha completa com rolagens' : 'A ficha segue o sistema da campanha',
    npcTypes: chip(Object.keys(NPCC), k => npcType === k, setNpcType), swVis: { track: vis ? 'var(--accent)' : 'var(--line)', knob: vis ? '21px' : '3px', go: () => setVis(!vis) },
    lvl, lvlDn: () => setLvl(Math.max(1, lvl - 1)), lvlUp: () => setLvl(Math.min(20, lvl + 1)), lvlNote: `Bônus de proficiência ${sg(prof)}`,
    races: RACES.map(([n, , b, sp], i) => { const on = race === i; return { n, b, sp, on, go: () => { setRace(i); setErr('') }, bg: on ? 'var(--accent-t)' : 'var(--surface)', rw: on ? '2px' : '1px', ring: on ? 'var(--accent)' : 'var(--line)' } }),
    classes: CLASSES.map(([n, icon, dd, pa], i) => { const on = cls === i; return { n, icon, b: `d${dd} · ${pa.join('/')}`, go: () => { setCls(i); setErr('') }, bg: on ? 'var(--accent-t)' : 'var(--surface)', rw: on ? '2px' : '1px', ring: on ? 'var(--accent)' : 'var(--line)', ib: on ? 'var(--accent)' : 'var(--surface2)', icol: on ? '#fff8f0' : 'var(--accent)' } }),
    methods: seg([['padrao', 'Conjunto padrão'], ['rolar', 'Rolar 4d6'], ['pontos', 'Compra de pontos']], method, k => { setMethod(k); setSel(null); if (k === 'padrao') setVals(PADRAO) }),
    methodHint: method === 'pontos' ? 'Distribua 27 pontos entre 8 e 15.' : 'Clique em dois atributos para trocar os valores. Os dourados são os da sua classe.',
    isRoll: method === 'rolar', isBuy: method === 'pontos', rollLabel: sets ? 'Rolar de novo' : 'Rolar 4d6 × 6', rollAll,
    hasSets: method === 'rolar' && !!sets,
    sets: (sets ?? []).map(r => {
      const lo = lowest(r)
      return { sum: rolling ? '…' : r.reduce((a, b) => a + b, 0) - r[lo], dice: r.map((x, j) => ({ v: x, op: !rolling && j === lo ? 0.35 : 1, td: !rolling && j === lo ? 'line-through' : 'none', anim: rolling ? 'criarpersonagem-dieJig .14s linear infinite' : 'none' })) }
    }),
    ptsLeft: left, ptsPct: Math.round(spent / 27 * 100), ptsColor: left === 0 ? 'var(--ok)' : 'var(--accent)',
    attrs: K.map((k, i) => {
      const bonus = rc?.[1][k] ?? 0, total = totals[i], selected = sel === i
      return {
        k, total, mod: sg(mod(total)), detail: bonus ? `${base[i]} + ${bonus}` : `base ${base[i]}`, rw: selected ? '2px' : '1px',
        ring: selected ? 'var(--accent)' : cl?.[3].includes(k) ? 'var(--gold)' : 'var(--line)',
        anim: tick ? `${tick % 2 ? 'criarpersonagem-swapA' : 'criarpersonagem-swapB'} .3s both` : 'none', buy: method === 'pontos', swap: method !== 'pontos',
        go: () => {
          if (sel == null) return setSel(i)
          if (sel === i) return setSel(null)
          const v = [...vals];[v[sel], v[i]] = [v[i], v[sel]]; setVals(v); setSel(null); setTick(n => n + 1)
        },
        dn: () => { if (buy[i] > 8) setBuy(buy.map((x, j) => (j === i ? x - 1 : x))) },
        upB: () => { const nv = buy[i] + 1; if (nv <= 15 && COST[nv] - COST[buy[i]] <= left) setBuy(buy.map((x, j) => (j === i ? nv : x))) },
        dnOp: buy[i] > 8 ? 1 : 0.35, upOp: buy[i] < 15 && COST[buy[i] + 1] - COST[buy[i]] <= left ? 1 : 0.35,
      }
    }),
    name, onName: (e: ChangeEvent<HTMLInputElement>) => { setName(e.target.value); setErr('') },
    suggest: () => {
      const A = ['Ae', 'Ly', 'Tha', 'Ser', 'Bryn', 'Kae', 'Ro', 'El', 'Mor', 'Dra', 'Ve', 'Isol'], B = ['ra', 'wyn', 'dor', 'lith', 'mir', 'ven', 'dain', 'sha', 'rek', 'de'], S2 = ['Sombravento', 'Martelo-Rubro', 'de Vernay', 'Folhaprata', 'Pedra-Funda', 'Cinzaluz', 'Corvo-Alto', 'Brasa']
      const p = (a: string[]) => a[Math.floor(Math.random() * a.length)]
      setName(`${p(A)}${p(B)} ${p(S2)}`); setErr('')
    },
    bgs: chip(BGS.map(b => b[0]), k => bg === k, setBg),
    aligns: ALIGN.map(([k, l]) => { const on = align === k; return { l, go: () => setAlign(k), bg: on ? 'var(--ink)' : 'var(--surface)', color: on ? 'var(--bg)' : 'var(--ink)', ring: on ? 'var(--ink)' : 'var(--line)' } }),
    story, onStory: (e: ChangeEvent<HTMLTextAreaElement>) => setStory(e.target.value), secret, onSecret: (e: ChangeEvent<HTMLTextAreaElement>) => setSecret(e.target.value),
    stats: [{ v: hp, l: 'Pontos de vida' }, { v: 10 + des, l: 'CA sem armadura' }, { v: sg(des), l: 'Iniciativa' }, { v: sg(prof), l: 'Proficiência' }, { v: rc ? rc[3].split(' · ')[0] : '9 m', l: 'Deslocamento' }],
    profs: [...(cl ? cl[3].map(k => `Salvaguarda de ${k}`) : []), ...Array.from(new Set([...(cl ? cl[4].slice(0, 2) : []), ...bgD[1]]))],
    storyLine: story.trim() || 'Sem história ainda — ela pode ser escrita durante a campanha.',
    canBack: step > 0, prev: () => { setStep(step - 1); setErr('') }, next,
    notLast: step < 4, isLast: step === 4, nextLabel: ['Ancestralidade', 'Atributos', 'Detalhes', 'Revisar'][step] ?? 'Continuar',
    hasErr: !!err, err, errAnim: shake ? `${shake % 2 ? 'criarpersonagem-shakeA' : 'criarpersonagem-shakeB'} .4s` : 'none',
    pvBg: PCOL[npc ? 0 : 1], init: (nm[0] || '?').toUpperCase(), pvName: nm || 'Sem nome ainda', nameColor: nm ? 'var(--ink)' : 'var(--muted)',
    pvLine: [rc?.[0], cl?.[0], `Nível ${lvl}`].filter(Boolean).join(' · '),
    npcColor: NPCC[npcType], npcLine: `${npcType} · ${vis ? 'visível' : 'restrito ao mestre'}`,
    miniStats: [{ v: hp, l: 'PV', anim: 'none' }, { v: 10 + des, l: 'CA', anim: 'none' }, { v: sg(prof), l: 'Prof.', anim: 'none' }],
    isSealing: sealing, done: !!doneHref, doneKick: npc ? 'NPC registrado no painel' : 'Ficha inscrita no livro',
    doneHref: doneHref ?? '#', doneLabel: npc ? 'Ver no painel' : 'Abrir a ficha',
    restart: () => { setStep(0); setMaxStep(0); setRace(null); setCls(null); setName(''); setStory(''); setSecret(''); setDoneHref(null); setSets(null); setSel(null) },
  }
}

export type Vals = ReturnType<typeof useCriarPersonagemVals>
