'use client'

import { useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy, Cpu, Dices, Eye, Feather, Moon, Swords, type LucideIcon } from 'lucide-react'
import { dcHref } from '@/lib/dc-routes'

/** Dados reais de /sistemas (app/(app)/sistemas/page.tsx). */
export type SistemasDados = {
  sistemas: { id: string; n: string; cat: string; official: boolean; d: string; attrs: [string, string][]; die: string; uses: number; author: string | null; mine: boolean }[]
}

const CAT: Record<string, [string, string, string]> = {
  fantasy: ['Fantasia', 'linear-gradient(150deg,#7a4a14,#4a2a08 60%,#2a1804)', '#a8701c'],
  wod: ['Mundo das Trevas', 'linear-gradient(150deg,#5a1a2e,#36101c 60%,#1c080e)', '#7a2a44'],
  horror: ['Horror', 'linear-gradient(150deg,#6a1414,#3e0a0a 60%,#1e0505)', '#8a1c24'],
  scifi: ['Sci-Fi', 'linear-gradient(150deg,#1e4a4a,#123030 60%,#081a1a)', '#2e6a6a'],
  generic: ['Genérico', 'linear-gradient(150deg,#5a4a34,#3a2e1e 60%,#1e180e)', '#76695a'],
}
// Categoria do banco → categoria da estante (personalizado entra em Genérico).
const DB_CAT: Record<string, string> = { fantasy: 'fantasy', 'world-of-darkness': 'wod', horror: 'horror', scifi: 'scifi', generic: 'generic', custom: 'generic' }
const ICON: Record<string, LucideIcon> = { fantasy: Swords, wod: Moon, horror: Eye, scifi: Cpu, generic: Dices }

export function useSistemasVals(d: SistemasDados) {
  const router = useRouter()
  const [cat, setCat] = useState('all')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<number | null>(null)
  const [cloned, setCloned] = useState<Record<number, boolean>>({})
  const [impOpen, setImpOpen] = useState(false)
  const [impFrom, setImpFrom] = useState<number[]>([])
  const [impBusy, setImpBusy] = useState(false)
  const [impMsg, setImpMsg] = useState('')
  const [impMsgOk, setImpMsgOk] = useState(true)
  const [added, setAdded] = useState<Record<number, [string, string, string][]>>({})

  const all = d.sistemas.map((x, i) => {
    const c = DB_CAT[x.cat] ?? 'generic'
    return { ...x, i, cat: c, icon: x.mine && x.cat === 'custom' ? Feather : ICON[c], community: !x.official, leather: CAT[c][1], catL: CAT[c][0] }
  })
  const qq = q.trim().toLowerCase()
  const list = all.filter(b => (cat === 'all' || (cat === 'community' ? b.community : b.cat === cat)) && (!qq || b.n.toLowerCase().includes(qq)))
    .map((b, k) => ({
      ...b, delay: (k * 0.035).toFixed(3), meta: `${b.attrs.length} atributos · ${b.community ? `por ${b.mine ? 'você' : b.author ?? '—'}` : 'Oficial'}`,
      sh: sel === b.i ? '0 0 0 3px var(--accent), 0 22px 30px -16px rgb(40 15 5/.7)' : '0 16px 24px -16px rgb(40 15 5/.65), 2px 0 0 #e6d5ac, 4px 0 0 #d8c39a',
      tf: sel === b.i ? 'translateY(-6px) rotate(-1.5deg)' : 'none', go: () => { setSel(b.i); setImpOpen(false); setImpFrom([]); setImpMsg('') },
    }))
  const counts = (k: string) => (k === 'all' ? all.length : k === 'community' ? all.filter(b => b.community).length : all.filter(b => b.cat === k).length)
  const cats = ([['all', 'Todos', 'var(--ink)'], ['fantasy', 'Fantasia', CAT.fantasy[2]], ['wod', 'Mundo das Trevas', CAT.wod[2]], ['horror', 'Horror', CAT.horror[2]], ['scifi', 'Sci-Fi', CAT.scifi[2]], ['generic', 'Genérico', CAT.generic[2]], ['community', 'Comunidade', '#3a6a7a']] as const)
    .map(([k, l, dot]) => ({ l, dot, n: counts(k), go: () => setCat(k), bg: cat === k ? 'var(--ink)' : 'var(--surface)', color: cat === k ? 'var(--bg)' : 'var(--ink)', ring: cat === k ? 'var(--ink)' : 'var(--line)' }))
  const b = sel != null ? all[sel] : null
  const done = b ? cloned[b.i] : false

  const imp = (() => {
    // "Importar de outro sistema" só em sistema da comunidade escrito por você.
    if (!b || !b.mine || b.official) return { mine: false as const }
    const have = new Set([...b.attrs, ...(added[b.i] ?? [])].map(([n]) => n.trim().toLowerCase()))
    const seen = new Set(have), fresh: [string, string, string][] = [], dup: [string, string][] = []
    impFrom.forEach(id => (all[id]?.attrs ?? []).forEach(([n, dd]) => {
      const k = n.trim().toLowerCase()
      if (seen.has(k)) { if (!dup.some(x => x[0].toLowerCase() === k)) dup.push([n, dd]) } else { seen.add(k); fresh.push([n, dd, all[id].n]) }
    }))
    const run = async () => {
      if (!impFrom.length || impBusy) return
      setImpBusy(true); setImpMsg('')
      const r = await fetch(`/api/systems/${b.id}/import`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fromSystemIds: impFrom.map(i => all[i].id) }) }).catch(() => null)
      const res = r?.ok ? await r.json().catch(() => null) as { imported?: number } | null : null
      setImpBusy(false)
      if (!res) { setImpMsgOk(false); setImpMsg('Não foi possível concluir agora. Tente de novo.'); return }
      const n = res.imported ?? fresh.length
      setImpFrom([]); setImpMsgOk(n > 0); setAdded(a => ({ ...a, [b.i]: [...(a[b.i] ?? []), ...fresh] }))
      setImpMsg(n ? `${n} atributo${n === 1 ? '' : 's'} importado${n === 1 ? '' : 's'}.` : 'Nada a importar — os atributos já existiam.')
      router.refresh()
    }
    return {
      mine: true as const, open: impOpen, rot: impOpen ? 'rotate(180deg)' : 'none', ring: impOpen ? 'var(--accent)' : 'var(--line)', bg: impOpen ? 'var(--surface)' : 'transparent',
      toggle: () => { setImpOpen(!impOpen); setImpMsg('') },
      opts: all.filter(x => x.i !== b.i).map(x => {
        const on = impFrom.includes(x.i)
        return { n: x.n, k: `${x.attrs.length} attr`, leather: x.leather, on, chk: on ? 1 : 0, box: on ? 'var(--accent)' : 'transparent', boxRing: on ? 'var(--accent)' : 'var(--line)', bg: on ? 'var(--accent-t)' : 'transparent', go: () => { setImpMsg(''); setImpFrom(f => (f.includes(x.i) ? f.filter(v => v !== x.i) : [...f, x.i])) } }
      }),
      hasPick: impFrom.length > 0, nNew: fresh.length, nDup: dup.length,
      preview: [...fresh.map(([n, dd]) => ({ n, d: dd, bg: 'color-mix(in oklab, var(--ok) 13%, transparent)', color: 'var(--ok)', dec: 'none' })), ...dup.map(([n, dd]) => ({ n, d: dd, bg: 'var(--surface)', color: 'var(--muted)', dec: 'line-through' }))].slice(0, 14),
      run: () => void run(), off: !impFrom.length || impBusy, op: !impFrom.length ? 0.45 : impBusy ? 0.75 : 1, spin: impBusy ? 'inline-block' : 'none',
      btn: impBusy ? 'Importando…' : impFrom.length > 1 ? `Importar de ${impFrom.length} sistemas` : 'Importar atributos',
      msg: impMsg, msgColor: impMsgOk ? 'var(--ok)' : 'var(--muted)',
    }
  })()

  const clone = async () => {
    if (!b || done) return
    const r = await fetch('/api/systems', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `${b.n} (cópia)`, description: b.d || undefined, category: Object.entries(DB_CAT).find(([, v]) => v === b.cat)?.[0] ?? 'custom', copyFromSystemIds: [b.id] }),
    }).catch(() => null)
    const novo = r?.ok ? await r.json().catch(() => null) as { id?: string } | null : null
    if (!novo?.id) return
    setCloned(c => ({ ...c, [b.i]: true }))
    setTimeout(() => router.push(`/sistemas/${novo.id}`), 900)
  }

  const nOf = all.filter(x => x.official).length, nCom = all.filter(x => x.community).length
  return {
    $href: (link: string) => dcHref(link),
    summary: `${nOf} oficiais · ${nCom} da comunidade · fichas prontas para todos`,
    q, onQ: (e: ChangeEvent<HTMLInputElement>) => setQ(e.target.value), cats, list,
    hasSel: !!b, closeSel: () => setSel(null),
    sel: b ? {
      ...b, origin: b.official ? 'Oficial' : `Comunidade · por ${b.mine ? 'você' : b.author ?? '—'}`, nAttr: b.attrs.length + (added[b.i] ?? []).length,
      attrs: [
        ...b.attrs.map(([n, dd], k) => ({ n, d: dd, from: '', anim: `sistemas-up .3s ${(k * 0.03).toFixed(2)}s both`, isNew: false })),
        ...(added[b.i] ?? []).map(([n, dd, from]) => ({ n, d: dd, from, isNew: true, anim: 'sistemas-newAttr 1.6s ease-out both' })),
      ],
    } : null!,
    imp,
    clone: () => void clone(),
    cloneLabel: done ? 'Cópia criada em “Meus sistemas”' : 'Clonar e editar', cloneIcon: done ? Check : Copy, cloneAnim: done ? 'sistemas-pop .3s both' : 'none',
  }
}

export type Vals = ReturnType<typeof useSistemasVals>
