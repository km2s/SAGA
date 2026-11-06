'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Hourglass, Plus, type LucideIcon } from 'lucide-react'
import { dcHref } from '@/lib/dc-routes'

/**
 * Porte do renderVals() de SAGA Convite.dc.html.
 * TODO(api): GET/POST /api/convites/[codigo] (contrato em docs/api-pendente.md).
 */
type Mesa = {
  id: string; n: string; sys: string; fmt: string; gm: string; when: string; next: string; tone: string
  taken: number; tot: number; d: string; members: { u: string; t: string }[]
}
type Busca = { campanha: Mesa; personagens: { id: string; t: string; d: string }[] }

const AV = ['#6b5a8a', '#b8492a', '#4f7a3a', '#3a6a7a', '#b98a2a', '#7a5a3a']
const COVERS = ['linear-gradient(135deg,#1a120c,#5c4410)', 'linear-gradient(135deg,#1a0c04,#d9662b)']

export function useConviteVals(inicial: string | null) {
  const [code, setCodeS] = useState('')
  const [status, setStatus] = useState<'idle' | 'search' | 'found' | 'nf'>('idle')
  const [shake, setShake] = useState(0)
  const [focus, setFocus] = useState(false)
  const [pick, setPick] = useState<string | null>(null)
  const [joined, setJoined] = useState<string | null>(null)
  const [busca, setBusca] = useState<Busca | null>(null)
  const inRef = useRef<HTMLInputElement>(null)
  const ts = useRef<ReturnType<typeof setTimeout>>()
  const req = useRef(0)

  const setCode = (raw: string) => {
    const c = String(raw).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
    clearTimeout(ts.current)
    setCodeS(c); setStatus(c.length === 8 ? 'search' : 'idle')
    if (c.length !== 8) return
    const id = ++req.current
    // A espera de 900 ms do design continua, mesmo se a resposta vier antes.
    const espera = new Promise(r => { ts.current = setTimeout(r, 900) })
    const resp = fetch(`/api/convites/${c}`).then(r => (r.ok ? r.json() as Promise<Busca> : null)).catch(() => null)
    Promise.all([resp, espera]).then(([b]) => {
      if (id !== req.current) return
      setBusca(b)
      if (b) { setStatus('found'); setPick(b.personagens[0]?.id ?? 'new') }
      else { setStatus('nf'); setShake(n => n + 1); setPick(null) }
    })
  }

  useEffect(() => {
    const tf = setTimeout(() => inRef.current?.focus(), 400)
    if (inicial) setCode(inicial)
    return () => { clearTimeout(tf); clearTimeout(ts.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const C = status === 'found' ? busca?.campanha ?? null : null
  const len = code.length
  const box = (i: number) => {
    const ch = code[i] || '', cur = i === len && focus && status === 'idle'
    return {
      ch,
      bg: status === 'found' ? 'color-mix(in oklab, var(--ok) 10%, var(--surface))' : status === 'nf' ? 'var(--accent-t)' : 'var(--surface)',
      ring: status === 'found' ? 'inset 0 0 0 1.5px var(--ok)' : status === 'nf' ? 'inset 0 0 0 1.5px var(--accent)' : ch ? 'inset 0 0 0 1.5px var(--gold)' : 'inset 0 0 0 1.5px var(--line)',
      anim: cur ? 'convite-ringPulse 1.4s ease-in-out infinite' : ch ? 'convite-boxIn .22s both' : 'none',
    }
  }
  const boxes = [0, 1, 2, 3, 4, 5, 6, 7].map(box)

  type Opt = { k: string; t: string; d: string; i: string; av: string; icon: LucideIcon | null; icD: string }
  const own: Opt[] = C ? (busca?.personagens ?? []).map((p, j) => ({ k: p.id, t: p.t, d: p.d, i: p.t.charAt(0).toUpperCase(), av: AV[(j + 4) % AV.length], icon: null, icD: 'none' })) : []
  const chars = C ? [...own,
    { k: 'new', t: 'Criar um novo personagem', d: `Abre o criador de fichas de ${C.sys}`, i: '', av: '#b8492a', icon: Plus, icD: 'block' },
    { k: 'later', t: 'Decidir depois', d: 'Entrar sem ficha e escolher na sessão zero', i: '', av: '#8a7a62', icon: Hourglass, icD: 'block' },
  ].map(o => {
    const on = pick === o.k
    return { ...o, go: () => setPick(o.k), bg: on ? 'rgb(184 73 42/.08)' : 'rgb(255 250 238/.6)', rw: on ? '2px' : '1px', ring: on ? '#b8492a' : 'rgb(120 80 30/.25)', dotW: on ? '5px' : '1.5px' }
  }) : []
  const pickT = chars.find(o => o.k === pick)

  const c = C ? {
    ...C, cover: COVERS[0], slot: 'convite-capa',
    facts: [{ k: 'Mestre', v: C.gm }, { k: 'Agenda', v: C.when }, { k: 'Próxima sessão', v: C.next }, { k: 'Tom', v: C.tone }],
    seats: Array.from({ length: C.tot }, (_, j) => j < C.taken
      ? { t: 'Ocupada', bg: '#b98a2a', ring: 'transparent', anim: 'none' }
      : j === C.taken ? { t: 'Sua vaga', bg: 'rgb(184 73 42/.2)', ring: '#b8492a', anim: 'convite-pulse 1.8s infinite' }
      : { t: 'Livre', bg: 'transparent', ring: 'rgb(120 80 30/.4)', anim: 'none' }),
    members: C.members.map((m, j) => ({ i: m.u.charAt(0).toUpperCase(), bg: AV[j % AV.length], t: `${m.u} · ${m.t}` })),
    memberLine: `${C.members.length} na companhia · ${C.tot - C.taken} ${C.tot - C.taken > 1 ? 'vagas livres' : 'vaga livre'}`,
  } : null

  const accept = async () => {
    if (!pick || !C) return
    const r = await fetch(`/api/convites/${code}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personagem: pick }) }).catch(() => null)
    // 409 = já faz parte da mesa: o resultado é o mesmo.
    if (r?.ok || r?.status === 409) setJoined(C.id)
    else { setStatus('nf'); setShake(n => n + 1) }
  }

  const stText = status === 'search' ? 'Procurando a mesa…' : status === 'found' ? 'Mesa encontrada' : status === 'nf' ? 'Nenhuma mesa com esse selo. Confira com o mestre.' : len ? `Faltam ${8 - len} ${8 - len > 1 ? 'caracteres' : 'caractere'}` : 'Digite os 8 caracteres do selo'
  return {
    $href: (link: string) => dcHref(link, { campaignId: joined ?? undefined }),
    // TODO(api): Campaign.coverUrl
    $img: (_id: string): string | null => null,
    boxesA: boxes.slice(0, 4), boxesB: boxes.slice(4), code, inRef,
    onCode: (e: ChangeEvent<HTMLInputElement>) => setCode(e.target.value), onFocus: () => setFocus(true), onBlur: () => setFocus(false),
    searching: status === 'search', stText, stColor: status === 'found' ? 'var(--ok)' : status === 'nf' ? 'var(--accent)' : 'var(--muted)',
    shakeAnim: shake ? `${shake % 2 ? 'convite-shakeA' : 'convite-shakeB'} .45s ease-in-out` : 'none',
    paste: () => {
      const f = () => inRef.current?.focus()
      try { navigator.clipboard.readText().then(t => setCode(t)).catch(f) } catch { f() }
    },
    clear: () => { clearTimeout(ts.current); req.current++; setCodeS(''); setStatus('idle'); setPick(null); setBusca(null); inRef.current?.focus() },
    // TODO(api): códigos recebidos no Discord (com quem mandou). Sem fonte, a linha não aparece.
    recent: [] as { l: string; from: string; go: () => void }[],
    found: !!c, c: c!, chars,
    accept, joined: !!joined,
    joinSub: !pickT || !C ? '' : pick === 'new' ? `${C.gm} foi avisada. Agora, crie sua ficha de ${C.sys}.` : pick === 'later' ? `${C.gm} foi avisada. Escolha sua ficha antes da sessão zero.` : `${pickT.t} foi apresentado à companhia.`,
    nextHref: pick === 'new' ? `/personagens/novo${joined ? `?campanha=${joined}` : ''}` : '/mensagens',
    nextLabel: pick === 'new' ? 'Criar ficha agora' : `Falar com ${C ? C.gm : 'o mestre'}`,
  }
}

export type Vals = ReturnType<typeof useConviteVals>
