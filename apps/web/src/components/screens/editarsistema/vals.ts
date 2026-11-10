'use client'

import { useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Pencil, TriangleAlert } from 'lucide-react'
import { dcHref } from '@/lib/dc-routes'

/** Dados reais de /sistemas/[id] (só o dono edita; o resto vai para a estante). */
export type EditarSistemaDados = {
  id: string; nome: string; descricao: string; meta: string
  attrs: { id: string; n: string; d: string }[]
}

type Attr = { key: string; id: string | null; n: string; d: string }
const DICE = ['d20', 'd10', 'd6', 'd100']
const json = (url: string, method: string, body?: unknown) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).catch(() => null)

export function useEditarSistemaVals(d: EditarSistemaDados) {
  const router = useRouter()
  const inicial = () => d.attrs.map(a => ({ key: a.id, id: a.id, n: a.n, d: a.d }))
  const [base, setBase] = useState({ name: d.nome, desc: d.descricao, attrs: inicial() })
  const [name, setName] = useState(d.nome)
  const [desc, setDesc] = useState(d.descricao)
  const [attrs, setAttrs] = useState<Attr[]>(inicial)
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState('')
  const [delAsk, setDelAsk] = useState(false)
  const [delErro, setDelErro] = useState('')
  const [fresh, setFresh] = useState<string | null>(null)
  const [nid, setNid] = useState(1)

  const mexe = () => { setDirty(true); setSaved(false); setErro('') }
  const mv = (i: number, dd: number) => { const j = i + dd; if (j < 0 || j >= attrs.length) return; const a = [...attrs]; [a[i], a[j]] = [a[j]!, a[i]!]; setAttrs(a); mexe() }
  const dup = (n: string) => attrs.filter(x => x.n.trim().toLowerCase() === n.trim().toLowerCase()).length > 1
  const bad = !name.trim() || attrs.some(a => !a.n.trim() || dup(a.n))

  const salvar = async () => {
    if (bad || busy) return
    setBusy(true); setErro('')
    const api = `/api/systems/${d.id}`
    const r1 = await json(api, 'PATCH', { name: name.trim(), description: desc })
    const r2 = r1?.ok ? await json(`${api}/attributes`, 'PUT', { attributes: attrs.map(a => ({ id: a.id ?? undefined, name: a.n.trim(), defaultDie: a.d })) }) : null
    setBusy(false)
    if (!r1?.ok || !r2?.ok) {
      const e = await (r2 ?? r1)?.json().catch(() => null) as { error?: string } | null
      setErro(e?.error ?? 'Não foi possível salvar agora. Tente de novo.')
      return
    }
    const j = await r2.json().catch(() => null) as { attributes?: { id: string; name: string; defaultDie: string }[] } | null
    const novos = (j?.attributes ?? []).map(a => ({ key: a.id, id: a.id, n: a.name, d: a.defaultDie }))
    setAttrs(novos); setBase({ name: name.trim(), desc, attrs: novos })
    setDirty(false); setSaved(true)
    router.refresh()
  }

  const apagar = async () => {
    if (!delAsk) { setDelAsk(true); setDelErro(''); return }
    const r = await json(`/api/systems/${d.id}`, 'DELETE')
    if (!r?.ok) { const e = await r?.json().catch(() => null) as { error?: string } | null; setDelErro(e?.error ?? 'Não foi possível apagar agora.'); setDelAsk(false); return }
    router.push('/sistemas')
  }

  const msg = erro || (saved ? 'Códice salvo. As fichas novas já usam este modelo.' : bad ? 'Corrija os campos em vermelho: nome vazio ou atributo repetido.' : busy ? 'Salvando…' : 'Alterações não salvas')
  return {
    $href: (link: string) => dcHref(link, {}),
    bibliotecaHref: `/sistemas?id=${d.id}`,
    meta: d.meta,
    name, onName: (e: ChangeEvent<HTMLInputElement>) => { setName(e.target.value); mexe() }, nameRing: name.trim() ? 'var(--line)' : 'var(--blood)',
    desc, onDesc: (e: ChangeEvent<HTMLTextAreaElement>) => { setDesc(e.target.value); mexe() },
    attrLine: `${attrs.length} atributo${attrs.length === 1 ? '' : 's'} · a ordem aqui é a ordem na ficha`,
    attrs: attrs.map((a, i) => ({
      n: a.n, die: a.d, first: i === 0, last: i === attrs.length - 1, upOp: i === 0 ? .3 : 1, dnOp: i === attrs.length - 1 ? .3 : 1, anim: a.key === fresh ? 'editarsistema-popIn .3s both' : 'none',
      ring: !a.n.trim() || dup(a.n) ? 'var(--blood)' : 'var(--line)', upM: () => mv(i, -1), dnM: () => mv(i, 1),
      onN: (e: ChangeEvent<HTMLInputElement>) => { setAttrs(xs => xs.map(x => x.key === a.key ? { ...x, n: e.target.value } : x)); mexe() },
      del: () => { setAttrs(xs => xs.filter(x => x.key !== a.key)); mexe() },
      dice: DICE.map(dd => ({ l: dd, bg: a.d === dd ? 'var(--ink)' : 'transparent', color: a.d === dd ? 'var(--bg)' : 'var(--muted)', go: () => { setAttrs(xs => xs.map(x => x.key === a.key ? { ...x, d: dd } : x)); mexe() } })),
    })),
    addAttr: () => { const key = `novo-${nid}`; setNid(n => n + 1); setFresh(key); setAttrs(xs => [...xs, { key, id: null, n: 'Novo atributo', d: 'd20' }]); mexe() },
    barTf: dirty || saved || erro ? 'none' : 'translateY(100%)', barIcon: saved && !erro ? Check : bad || erro ? TriangleAlert : Pencil,
    barC: erro ? 'var(--blood)' : saved ? 'var(--ok)' : bad ? 'var(--blood)' : 'var(--muted)', barText: msg,
    discard: () => { setName(base.name); setDesc(base.desc); setAttrs(base.attrs); setDirty(false); setSaved(false); setErro('') },
    saveAll: () => { void salvar() },
    askDel: () => { void apagar() }, delLabel: delErro || (delAsk ? 'Clique de novo para apagar de vez' : 'Apagar códice'),
  }
}

export type Vals = ReturnType<typeof useEditarSistemaVals>
