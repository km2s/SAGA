'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { dcHref } from '@/lib/dc-routes'

/** Dados reais de /explorar (app/(app)/explorar/page.tsx). */
export type ExplorarDados = {
  mesas: { id: string; n: string; sys: string; fmt: 'Campanha' | 'One-shot'; gm: string; taken: number; tot: number; when: string; newbie: boolean; tags: string; d: string }[]
  cartas: { n: string; s: string; st: string; dot: string }[]
  personagens: { id: string; t: string; d: string; sys: string }[]
  discord: string
}

const AV = ['#b8492a', '#b98a2a', '#4f7a3a', '#6b5a8a', '#7a5a3a', '#3a6a7a']
const COVERS = ['linear-gradient(135deg,#1a0c04,#d9662b)', 'linear-gradient(135deg,#2a1c08,#c9a22a)', 'linear-gradient(135deg,#0b0c11,#6a2817)', 'linear-gradient(135deg,#0e0e14,#3a3a5a)', 'linear-gradient(135deg,#0e1a1c,#3a5a5a)', 'linear-gradient(135deg,#140a1a,#8a2a5a)']
const EXP: Record<string, string> = { 'Primeira vez': 'beginner', 'Já joguei': 'intermediate', 'Veterano': 'advanced' }
// Regras da Taverna (iguais para todas as mesas, como no design).
const RULES = ['Linhas e véus combinados na sessão zero', 'Câmera opcional, microfone obrigatório', 'Rolagens abertas no registro da mesa']

export function useExplorarVals(d: ExplorarDados) {
  const [q, setQ] = useState('')
  const [fmt, setFmt] = useState('Todos')
  const [sys, setSys] = useState('Todos')
  const [newbie, setNewbie] = useState(false)
  const [vagas, setVagas] = useState(true)
  const [sent, setSent] = useState<Record<string, true>>({})
  const [modal, setModal] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [exp, setExp] = useState('Já joguei')
  const [sealing, setSealing] = useState(false)
  const [avail, setAvail] = useState('Sempre posso')
  const [pick, setPick] = useState('new')
  const [agree, setAgree] = useState(false)
  const [dh, setDh] = useState(d.discord)
  const [err, setErr] = useState('')
  const [shake, setShake] = useState(0)
  const ts = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => () => clearTimeout(ts.current), [])

  const all = d.mesas.map((c, i) => ({ ...c, cover: COVERS[i % COVERS.length], slot: `explorar-capa-${c.id}`, idx: i }))
  const seats = (c: typeof all[number], dark?: boolean) => Array.from({ length: c.tot }, (_, j) => ({
    t: j < c.taken ? 'Ocupada' : 'Livre',
    bg: j < c.taken ? (dark ? '#c9a22a' : 'var(--gold)') : 'transparent',
    ring: j < c.taken ? 'transparent' : (dark ? 'rgb(241 227 194/.45)' : 'var(--muted)'),
  }))
  const vagasTxt = (c: typeof all[number]) => (c.tot - c.taken ? `${c.tot - c.taken} ${c.tot - c.taken > 1 ? 'vagas' : 'vaga'}` : 'Lotada')
  const abrir = (id: string) => { setModal(id); setMsg(''); setSealing(false); setErr(''); setAgree(false); setPick('new') }
  const qq = q.trim().toLowerCase()
  const list = all.slice(1)
    .filter(c => (fmt === 'Todos' || c.fmt === fmt) && (sys === 'Todos' || c.sys === sys) && (!newbie || c.newbie) && (!vagas || c.tot > c.taken) && (!qq || (c.n + c.tags + c.gm + c.d).toLowerCase().includes(qq)))
    .map((c, k) => ({
      ...c, delay: (k * 0.05).toFixed(2), fmtBg: c.fmt === 'One-shot' ? '#b8492a' : '#7a5a1c', gmI: c.gm.charAt(0).toUpperCase(), gmBg: AV[c.idx % 6],
      seats: seats(c), vagas: vagasTxt(c), sent: !!sent[c.id], open: !sent[c.id] && c.tot > c.taken, apply: () => abrir(c.id),
    }))
  const f = all[0]
  const seg = (arr: string[], cur: string, set: (v: string) => void) => arr.map(l => ({ l, go: () => set(l), bg: cur === l ? 'var(--surface)' : 'transparent', color: cur === l ? 'var(--ink)' : 'var(--muted)', sh: cur === l ? '0 1px 2px rgb(0 0 0/.08)' : 'none' }))
  const cur = all.find(c => c.id === modal) ?? null
  const meus = cur ? d.personagens.filter(p => p.sys === cur.sys) : []
  const opts: [string, string, string, string, string][] = [
    ...meus.map(p => [p.id, p.t, p.d, p.t.charAt(0).toUpperCase(), '#b98a2a'] as [string, string, string, string, string]),
    ['new', 'Criar depois do aceite', 'O mestre ajuda na sessão zero', '+', '#b8492a'],
    ['pre', 'Personagem pré-pronto', 'O mestre entrega uma ficha', '✦', '#6b5a8a'],
  ]
  const sistemas = Array.from(new Set(all.map(c => c.sys)))

  const send = async () => {
    if (sealing || !cur) return
    if (msg.trim().length < 10) { setErr('Escreva ao menos uma frase para o mestre.'); setShake(n => n + 1); return }
    if (!agree) { setErr('Aceite as regras da mesa para enviar.'); setShake(n => n + 1); return }
    setSealing(true); setErr('')
    const escolha = opts.find(o => o[0] === pick)?.[1] ?? ''
    // A carta vai inteira em characterDesc (até 1000 caracteres).
    const carta = [msg.trim(), `Personagem: ${escolha}`, `Experiência: ${exp}`, `Disponibilidade: ${avail}`, dh.trim() ? `Discord: ${dh.trim()}` : ''].filter(Boolean).join('\n').slice(0, 1000)
    const [r] = await Promise.all([
      fetch(`/api/campaigns/${cur.id}/apply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ characterDesc: carta, experienceLevel: EXP[exp] }) }).catch(() => null),
      new Promise(res => setTimeout(res, 800)),
    ])
    setSealing(false)
    if (!r?.ok) {
      const body = r ? await r.json().catch(() => null) as { error?: string } | null : null
      setErr(body?.error ?? 'Não foi possível concluir agora. Tente de novo.'); setShake(n => n + 1); return
    }
    setModal(null); setSent(x => ({ ...x, [cur.id]: true }))
  }

  return {
    $href: (link: string) => dcHref(link),
    $img: (_id?: string): string | null => null, // TODO(api): Campaign.coverUrl
    temFeat: !!f,
    feat: f ? { ...f, seats: seats(f, true), vagas: `${vagasTxt(f)} de ${f.tot}`, open: !sent[f.id] && f.tot > f.taken, sent: !!sent[f.id], apply: () => abrir(f.id) } : null!,
    q, onQ: (e: ChangeEvent<HTMLInputElement>) => setQ(e.target.value), fmts: seg(['Todos', 'Campanha', 'One-shot'], fmt, setFmt),
    toggles: ([['newbie', 'Iniciantes bem-vindos', newbie, setNewbie], ['vagas', 'Só com vagas', vagas, setVagas]] as const).map(([, l, on, set]) => ({
      l, go: () => set(!on), track: on ? 'var(--accent)' : 'var(--line)', knob: on ? '14px' : '2px', bg: on ? 'var(--accent-t)' : 'var(--surface)', ring: on ? 'color-mix(in oklab, var(--accent) 40%, transparent)' : 'var(--line)', color: 'var(--ink)',
    })),
    systems: ['Todos', ...sistemas].map(l => ({ l, go: () => setSys(l), bg: sys === l ? 'var(--ink)' : 'var(--surface)', color: sys === l ? 'var(--bg)' : 'var(--ink)', ring: sys === l ? 'var(--ink)' : 'var(--line)' })),
    list, empty: list.length === 0, countLabel: `${list.length} ${list.length === 1 ? 'mesa encontrada' : 'mesas encontradas'}`,
    mine: [...d.cartas, ...all.filter(c => sent[c.id]).map(c => ({ n: c.n, s: 'Enviada agora', st: 'Aguardando', dot: 'var(--gold)' }))],
    modal: !!cur, cur: cur ?? ({} as Partial<typeof all[number]>), msg, onMsg: (e: ChangeEvent<HTMLTextAreaElement>) => setMsg(e.target.value), sealing,
    exps: seg(['Primeira vez', 'Já joguei', 'Veterano'], exp, setExp),
    closeModal: () => setModal(null),
    curFacts: cur ? [{ k: 'Mestre', v: cur.gm }, { k: 'Agenda', v: cur.when || '—' }, { k: 'Vagas', v: `${cur.tot - cur.taken} de ${cur.tot}` }, { k: 'Tom', v: cur.tags || '—' }] : [],
    rules: RULES,
    charOpts: opts.map(([k, t, dd, i, av]) => { const on = pick === k; return { t, d: dd, i, av, go: () => setPick(k), bg: on ? 'var(--accent-t)' : 'var(--surface)', rw: on ? '2px' : '1px', ring: on ? 'var(--accent)' : 'var(--line)' } }),
    avails: seg(['Sempre posso', 'Quase sempre', 'Ainda não sei'], avail, setAvail),
    msgCount: `${msg.length}/400`, dh, onDh: (e: ChangeEvent<HTMLInputElement>) => setDh(e.target.value), agree, toggleAgree: () => { setAgree(!agree); setErr('') },
    hasErr: !!err, err, errAnim: shake ? `${shake % 2 ? 'explorar-shakeA' : 'explorar-shakeB'} .4s` : 'none',
    send: () => void send(),
  }
}

export type Vals = ReturnType<typeof useExplorarVals>
