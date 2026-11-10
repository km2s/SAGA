'use client'

import { useState, type ChangeEvent } from 'react'
import { Crown, Lock, Users, type LucideIcon } from 'lucide-react'

type Vis = 'CAMPAIGN' | 'PRIVATE' | 'GM_ONLY'
/** Dados reais de /campaign/[id]/notes: só as notas que este membro pode ler (mesma regra do GET da API). */
export type NotasDados = {
  campaignId: string; campanha: string; souMestre: boolean; eu: string
  notas: { id: string; t: string; x: string; vis: Vis; u: string; when: string }[]
}

const V: Record<Vis, [string, LucideIcon, string, string, string]> = {
  CAMPAIGN: ['Campanha', Users, 'Todos da campanha leem', 'var(--surface2)', 'var(--muted)'],
  PRIVATE: ['Privada', Lock, 'Só você lê', 'var(--accent-t)', 'var(--accent)'],
  GM_ONLY: ['Só o Mestre', Crown, 'Só o Mestre lê', 'var(--gold-t)', 'color-mix(in oklab, var(--gold) 70%, var(--ink))'],
}
const AVS = ['linear-gradient(135deg,#3a6a4a,#1e3a28)', 'linear-gradient(135deg,#5a1a2e,#2a0a16)', 'linear-gradient(135deg,#7a4a14,#3a2208)', 'linear-gradient(135deg,#6a5a3a,#2e2618)']
const GM_AV = 'linear-gradient(135deg,#c9a22a,#8a6320)'

export function useNotasVals(d: NotasDados) {
  const gm = d.souMestre
  const [filter, setFilter] = useState<'all' | Vis>('all')
  const [fT, setFT] = useState('')
  const [fX, setFX] = useState('')
  const [vis, setVis] = useState<Vis>('CAMPAIGN')
  const [err, setErr] = useState('')
  const [shake, setShake] = useState(0)
  const [busy, setBusy] = useState(false)
  const [notas, setNotas] = useState(d.notas)
  const [fresh, setFresh] = useState<string | null>(null)

  // Só o mestre cria "Só o Mestre" (a API recusa para jogadores).
  const opts: Vis[] = gm ? ['CAMPAIGN', 'PRIVATE', 'GM_ONLY'] : ['CAMPAIGN', 'PRIVATE']
  const fil: ['all' | Vis, string][] = [['all', 'Todas'], ['CAMPAIGN', 'Campanha'], ['PRIVATE', 'Minhas privadas'], ...(gm ? [['GM_ONLY', 'Só o Mestre'] as ['GM_ONLY', string]] : [])]
  const list = notas.filter(n => filter === 'all' || n.vis === filter)
  const visKey = opts.includes(vis) ? vis : 'CAMPAIGN'
  const autores = Array.from(new Set(notas.map(n => n.u)))
  const av = (u: string, gmNota: boolean) => gmNota ? GM_AV : AVS[Math.max(0, autores.indexOf(u)) % AVS.length]!
  const falha = (m: string) => { setErr(m); setShake(s => s + 1) }

  const save = async () => {
    if (busy) return
    if (!fX.trim()) return falha('Escreva alguma coisa antes de guardar.')
    setBusy(true)
    const r = await fetch(`/api/campaigns/${d.campaignId}/notes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: fT.trim() || undefined, content: fX.trim(), visibility: visKey }),
    }).catch(() => null)
    setBusy(false)
    const j = r ? await r.json().catch(() => null) as { id?: string; error?: string } | null : null
    if (!r?.ok || !j?.id) return falha(j?.error ?? 'Não foi possível guardar agora. Tente de novo.')
    setNotas(ns => [{ id: j.id!, t: fT.trim() || 'Sem título', x: fX.trim(), vis: visKey, u: d.eu, when: 'agora' }, ...ns])
    setFresh(j.id); setFT(''); setFX(''); setErr('')
  }

  return {
    campanha: d.campanha,
    temVisao: false, views: [] as { l: string; go: () => void; bg: string; color: string; sh: string }[],
    backHref: `/campaign/${d.campaignId}`,
    summary: `${notas.length} ${notas.length === 1 ? 'nota que você pode ler' : 'notas que você pode ler'} · notas privadas só aparecem para quem as escreveu`,
    fT, fX, onT: (e: ChangeEvent<HTMLInputElement>) => setFT(e.target.value), onX: (e: ChangeEvent<HTMLTextAreaElement>) => { setFX(e.target.value); setErr('') },
    xRing: err ? 'var(--blood)' : 'var(--line)', err,
    shake: shake ? `${shake % 2 ? 'notas-shakeA' : 'notas-shakeB'} .45s both` : 'none',
    visOpts: opts.map(k => { const on = visKey === k; return { l: V[k][0], d: V[k][2], icon: V[k][1], ic: on ? 'var(--accent)' : 'var(--muted)', on, ring: on ? 'var(--accent)' : 'var(--line)', bg: on ? 'var(--accent-t)' : 'transparent', dotW: on ? '4px' : '1.5px', go: () => setVis(k) } }),
    save: () => { void save() },
    filters: fil.map(([k, l]) => ({ l, n: k === 'all' ? notas.length : notas.filter(n => n.vis === k && (k !== 'PRIVATE' || n.u === d.eu)).length, go: () => setFilter(k), bg: filter === k ? 'var(--ink)' : 'var(--surface)', color: filter === k ? 'var(--bg)' : 'var(--ink)', ring: filter === k ? 'var(--ink)' : 'var(--line)' })),
    notes: list.map(n => ({
      ...n, i: (n.u[0] ?? '?').toUpperCase(), av: av(n.u, n.vis === 'GM_ONLY'),
      vL: V[n.vis][0], vIcon: V[n.vis][1], vBg: V[n.vis][3], vC: V[n.vis][4],
      mark: n.vis === 'GM_ONLY' ? 'inset 3px 0 0 var(--gold)' : n.vis === 'PRIVATE' ? 'inset 3px 0 0 var(--accent)' : 'none', anim: n.id === fresh ? 'notas-popIn .35s both' : 'none',
    })),
    empty: list.length === 0,
  }
}

export type Vals = ReturnType<typeof useNotasVals>
