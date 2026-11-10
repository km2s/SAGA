'use client'

import { useState } from 'react'

/** Dados reais de /campaign/[id]/sessions. Mais recente primeiro. */
export type SessoesDados = {
  campaignId: string; campanha: string; souMestre: boolean
  sessoes: { id: string; num: string; n: string; date: string; d: string; dur: string; rolls: number; crits: number; live: boolean }[]
  totalRolagens: number
}

export function useSessoesVals(d: SessoesDados) {
  const gm = d.souMestre
  const [filter, setFilter] = useState<'all' | 'sum' | 'nosum'>('all')
  const items = d.sessoes.map(s => ({
    ...s, noSum: !s.d && !s.live,
    d: s.d || (gm ? 'Ainda sem resumo. Escreva o que aconteceu para a companhia.' : 'O Mestre ainda não escreveu o resumo.'),
    href: s.live ? `/campaign/${d.campaignId}/mesa` : `/campaign/${d.campaignId}/sessions/${s.id}`,
    dot: s.live ? 'var(--blood)' : s.d ? 'var(--gold)' : 'var(--line)', dotAnim: s.live ? 'sessoes-pulse 2s infinite' : 'none',
  }))
  const list = items.filter(x => filter === 'all' || (filter === 'sum' ? !x.noSum && !x.live : x.noSum)).map((x, i) => ({ ...x, delay: (i * .05).toFixed(2) }))
  const n = d.sessoes.length
  return {
    campanha: d.campanha,
    // Visão pelo papel na campanha (o seletor do protótipo não aparece).
    temVisao: false, views: [] as { l: string; go: () => void; bg: string; color: string; sh: string }[],
    backHref: `/campaign/${d.campaignId}`,
    summary: `${n} ${n === 1 ? 'sessão' : 'sessões'} · ${d.totalRolagens} ${d.totalRolagens === 1 ? 'rolagem' : 'rolagens'} na crônica`,
    filters: ([['all', 'Todas', items.length], ['sum', 'Com resumo', items.filter(x => !x.noSum && !x.live).length], ['nosum', 'Sem resumo', items.filter(x => x.noSum).length]] as const).map(([k, l, c]) => ({
      l, n: c, go: () => setFilter(k), bg: filter === k ? 'var(--ink)' : 'var(--surface)', color: filter === k ? 'var(--bg)' : 'var(--ink)', ring: filter === k ? 'var(--ink)' : 'var(--line)',
    })),
    list,
  }
}

export type Vals = ReturnType<typeof useSessoesVals>
