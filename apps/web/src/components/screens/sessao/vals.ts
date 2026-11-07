'use client'

import { useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Dices, Save, Sparkles, Trophy, Users, type LucideIcon } from 'lucide-react'
import { dcHref } from '@/lib/dc-routes'

/** Dados reais de /campaign/[id]/sessions/[sessionId]. */
export type SessaoDados = {
  campaignId: string; sessionId: string; campanha: string; souMestre: boolean
  sessaoN: string; estado: string; titulo: string; duracao: string
  resumo: string
  stats: { rolagens: number; criticos: number; maior: number | null; naMesa: number }
  destaque: { t: string; d: string; total: number } | null
  rollers: { u: string; n: number }[]
  log: { u: string; what: string; e: string; d: string; t: number; h: string; crit: boolean; um: boolean }[]
}

const AVS = ['linear-gradient(135deg,#3a6a4a,#1e3a28)', 'linear-gradient(135deg,#5a1a2e,#2a0a16)', 'linear-gradient(135deg,#7a4a14,#3a2208)', 'linear-gradient(135deg,#6a5a3a,#2e2618)', 'linear-gradient(135deg,#c9a22a,#8a6320)']

export function useSessaoVals(d: SessaoDados) {
  const router = useRouter()
  const [text, setText] = useState(d.resumo)
  const [draft, setDraft] = useState(d.resumo)
  const [editing, setEditing] = useState(false)
  const [err, setErr] = useState('')
  const [shake, setShake] = useState(0)
  const [onlyCrit, setOnlyCrit] = useState(false)
  const [saved, setSaved] = useState(false)
  const gm = d.souMestre
  const ins = (t: string) => setDraft(x => (x ? `${x}\n` : '') + t)

  const save = async () => {
    if (!draft.trim()) { setErr('Escreva algo antes de salvar.'); setShake(n => n + 1); return }
    const r = await fetch(`/api/campaigns/${d.campaignId}/sessions/${d.sessionId}/summary`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: draft.trim() }) }).catch(() => null)
    if (!r?.ok) { setErr('Não foi possível concluir agora. Tente de novo.'); setShake(n => n + 1); return }
    setText(draft.trim()); setEditing(false); setSaved(true); router.refresh()
  }

  const stats: [LucideIcon, string, number | string, string, string][] = [
    [Dices, 'Rolagens', d.stats.rolagens, 'var(--gold-t)', 'color-mix(in oklab, var(--gold) 70%, var(--ink))'],
    [Sparkles, 'Críticos', d.stats.criticos, 'color-mix(in oklab, var(--ok) 14%, transparent)', 'var(--ok)'],
    [Trophy, 'Maior total', d.stats.maior ?? '—', 'var(--accent-t)', 'var(--accent)'],
    [Users, 'Na mesa', d.stats.naMesa, 'var(--surface2)', 'var(--muted)'],
  ]
  const topo = d.rollers[0]?.n ?? 1

  return {
    $href: (link: string) => dcHref(link, { campaignId: d.campaignId }),
    campanha: d.campanha, sessaoN: d.sessaoN, estado: d.estado, titulo: d.titulo, duracao: d.duracao, temVisao: false,
    isGM: gm, views: [] as { l: string; go: () => void; bg: string; color: string; sh: string }[],
    stats: stats.map(([icon, l, v, bg, color], i) => ({ icon, l, v, bg, color, delay: (i * 0.05).toFixed(2) })),
    editing: gm && editing, reading: !editing && !!text, empty: !editing && !text,
    emptyText: gm ? 'Esta sessão ainda não tem resumo. Os jogadores leem aqui o que aconteceu.' : 'O Mestre ainda não escreveu o resumo desta sessão.',
    canEditBtn: gm && !editing && !!text, editLabel: saved ? 'Salvo · editar de novo' : 'Editar',
    startEdit: () => { setEditing(true); setDraft(text); setErr(''); setSaved(false) },
    draft, onDraft: (e: ChangeEvent<HTMLTextAreaElement>) => { setDraft(e.target.value); setErr('') }, draftRing: err ? 'var(--blood)' : 'var(--line)', err,
    shake: shake ? `${shake % 2 ? 'sessao-shakeA' : 'sessao-shakeB'} .45s both` : 'none',
    tools: [['# Título', '# '], ['## Subtítulo', '## '], ['¶ Parágrafo', '']].map(([l, t]) => ({ l, go: () => ins(t) })),
    cancel: () => { setEditing(false); setDraft(text); setErr('') },
    save: () => void save(), saveLabel: 'Salvar resumo', saveIcon: Save,
    blocks: text.split('\n').filter(l => l.trim()).map(l => (l.startsWith('## ') ? { h2: true, h1: false, p: false, t: l.slice(3) } : l.startsWith('# ') ? { h1: true, h2: false, p: false, t: l.slice(2) } : { p: true, h1: false, h2: false, t: l })),
    temDestaque: !!d.destaque, destaque: d.destaque ?? { t: '', d: '', total: 0 },
    rollers: d.rollers.map((r, k) => ({ u: r.u, i: r.u.charAt(0).toUpperCase(), n: r.n, av: AVS[k % AVS.length], k: k + 1, pct: Math.round(r.n / topo * 100) })),
    toggleCrit: () => setOnlyCrit(!onlyCrit), critBg: onlyCrit ? 'var(--gold-t)' : 'transparent', critColor: onlyCrit ? 'color-mix(in oklab, var(--gold) 70%, var(--ink))' : 'var(--muted)', critRing: onlyCrit ? 'var(--gold)' : 'var(--line)',
    // TODO(api): rolagens privadas (marcadores e resultado escondido) quando RollLog tiver visibilidade.
    log: d.log.filter(r => !onlyCrit || r.crit).map(r => ({
      u: r.u, crit: r.crit, what: r.what, t: r.t, detail: `${r.e} · [${r.d}] · ${r.h}`,
      hasVis: false, visL: '', visIcon: Sparkles,
      bg: r.crit ? 'color-mix(in oklab, var(--gold-t) 60%, transparent)' : 'transparent', color: r.crit ? 'var(--gold)' : r.um ? 'var(--blood)' : 'var(--ink)',
    })),
  }
}

export type Vals = ReturnType<typeof useSessaoVals>
