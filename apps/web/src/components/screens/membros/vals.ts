'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy } from 'lucide-react'
import { dcHref } from '@/lib/dc-routes'

/** Dados reais de /campaign/[id]/members (app/(app)/campaign/[id]/members/page.tsx). */
export type MembrosDados = {
  campaignId: string; campanha: string; sistema: string | null; sistemaId: string | null; souMestre: boolean; eu: string
  mestre: { nome: string; linha: string }
  usaHp: boolean
  jogadores: { memberId: string; u: string; c: string | null; cls: string | null; hp: number; max: number; st: 'on' | 'away' | 'off'; quando: string; fichaId: string | null }[]
}

const AVS = ['linear-gradient(135deg,#3a6a4a,#1e3a28)', 'linear-gradient(135deg,#7a4a14,#3a2208)', 'linear-gradient(135deg,#5a1a2e,#2a0a16)', 'linear-gradient(135deg,#3a5a7a,#1a2a3e)', 'linear-gradient(135deg,#6a5a3a,#2e2618)']

export function useMembrosVals(d: MembrosDados) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'on' | 'none'>('all')
  const [confirm, setConfirm] = useState<string | null>(null)
  const [created, setCreated] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState(false)
  const ct = useRef<ReturnType<typeof setTimeout>>()
  const gm = d.souMestre

  // Presença: sinal a cada 20 s (como o heartbeat atual) e lista atualizada no mesmo ritmo.
  useEffect(() => {
    const ping = () => { void fetch(`/api/campaigns/${d.campaignId}/presence`, { method: 'POST' }).catch(() => null) }
    ping()
    const iv = setInterval(() => { ping(); router.refresh() }, 20000)
    return () => { clearInterval(iv); clearTimeout(ct.current) }
  }, [d.campaignId, router])

  const criar = async (p: MembrosDados['jogadores'][number]) => {
    if (confirm !== p.memberId) return setConfirm(p.memberId)
    const r = await fetch('/api/characters', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: d.campaignId, memberId: p.memberId, name: `Ficha de ${p.u}`, templateSystemIds: d.sistemaId ? [d.sistemaId] : undefined }),
    }).catch(() => null)
    const ch = r?.ok ? await r.json().catch(() => null) as { id?: string } | null : null
    setConfirm(null)
    if (ch?.id) { setCreated(x => ({ ...x, [p.memberId]: ch.id! })); router.refresh() }
  }

  const all = d.jogadores.map((p, k) => {
    const made = created[p.memberId], hasChar = !!p.c || !!made
    return {
      u: p.u, i: p.u.charAt(0).toUpperCase(), av: AVS[k % AVS.length], me: !gm && p.u === d.eu, hasChar, noChar: !hasChar, st: p.st,
      c: p.c ?? (made ? `Ficha de ${p.u}` : ''), cls: p.cls ?? (made ? `${d.sistema ?? 'Ficha'} · Nv 1 · em branco` : ''),
      hp: p.c ? p.hp : 10, max: p.c ? p.max : 10, pct: p.c && p.max > 0 ? Math.round(p.hp / p.max * 100) : 100,
      hpColor: p.c && p.max > 0 && p.hp / p.max < 0.4 ? 'var(--blood)' : 'var(--ok)', hasHp: hasChar && d.usaHp,
      dot: p.st === 'on' ? 'var(--ok)' : p.st === 'away' ? 'var(--gold)' : 'var(--line)', dotAnim: p.st === 'on' ? 'membros-pulse 1.8s infinite' : 'none',
      presence: p.st === 'on' ? 'Online agora' : `Visto ${p.quando}`, pColor: p.st === 'on' ? 'var(--ok)' : 'var(--muted)',
      canOpen: gm || p.u === d.eu, canCreate: gm,
      fichaHref: `/personagens/${made ?? p.fichaId ?? p.memberId}`,
      noCharText: gm ? 'Ainda sem personagem nesta campanha.' : `@${p.u} ainda está escrevendo o personagem.`,
      createLabel: confirm === p.memberId ? `Confirmar: ficha de ${d.sistema ?? 'sistema da campanha'}` : `Criar ficha para @${p.u}`,
      create: () => void criar(p),
    }
  })
  const online = all.filter(p => p.st === 'on').length + 1
  const cnt = { all: all.length, on: all.filter(p => p.st === 'on').length, none: all.filter(p => p.noChar).length }

  return {
    $href: (link: string) => dcHref(link, { campaignId: d.campaignId }),
    campanha: d.campanha, temVisao: false,
    gmInicial: d.mestre.nome.charAt(0).toUpperCase(), gmNome: d.mestre.nome, gmLinha: d.mestre.linha,
    codigo: '—', // TODO(api): Campaign.inviteCode
    isGM: gm, summary: `${online} de ${all.length + 1} na taverna agora · a presença se atualiza sozinha`,
    views: [] as { l: string; go: () => void; bg: string; color: string; sh: string }[],
    nPlayers: all.length,
    filters: ([['all', 'Todos'], ['on', 'Online'], ['none', 'Sem ficha']] as const).map(([k, l]) => ({ l, n: cnt[k], go: () => setFilter(k), bg: filter === k ? 'var(--ink)' : 'var(--surface)', color: filter === k ? 'var(--bg)' : 'var(--ink)', ring: filter === k ? 'var(--ink)' : 'var(--line)' })),
    players: all.filter(p => filter === 'all' || (filter === 'on' ? p.st === 'on' : p.noChar)).map((p, k) => ({ ...p, delay: (k * 0.05).toFixed(2) })),
    copy: () => { clearTimeout(ct.current); setCopied(true); ct.current = setTimeout(() => setCopied(false), 2000) },
    copyLabel: copied ? 'Copiado' : 'Copiar', copyIcon: copied ? Check : Copy, copyColor: copied ? 'var(--ok)' : 'var(--ink)',
  }
}

export type Vals = ReturnType<typeof useMembrosVals>
