'use client'

import { useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Coins, Eye, EyeOff, Folder, FolderOpen, Inbox, Library, ShieldAlert, User, UserCheck, Wind, type LucideIcon } from 'lucide-react'
import { dcHref } from '@/lib/dc-routes'

/** Dados reais de /campaign/[id]/npcs (app/(app)/campaign/[id]/npcs/page.tsx). */
export type NpcsDados = {
  campaignId: string; campanha: string; souMestre: boolean; selInicial: string | null
  pastas: { id: string; n: string }[]
  jogadores: { memberId: string; u: string }[]
  npcs: { id: string; n: string; type: string; folderId: string | null; lv: number; hp: number; max: number; publico: boolean; d: string; img: string | null; attrs: { k: string; m: string }[]; vis: string[] }[]
}

const T: Record<string, [string, LucideIcon, string, string]> = {
  VILLAIN: ['Vilão', ShieldAlert, '#8a1c24', 'linear-gradient(150deg,#5a1414,#1e0505)'], ALLY: ['Aliado', UserCheck, '#4f7a3a', 'linear-gradient(150deg,#2e4a24,#0e1a0a)'],
  MERCHANT: ['Mercador', Coins, '#b98a2a', 'linear-gradient(150deg,#6a4a14,#2a1804)'], NEUTRAL: ['Neutro', User, '#76695a', 'linear-gradient(150deg,#4a3e2e,#1e180e)'],
  MOUNT: ['Montaria', Wind, '#3a6a7a', 'linear-gradient(150deg,#1e4a4a,#081a1a)'],
}
// Tipos do banco sem cor própria no design.
const TIPO: Record<string, string> = { ENEMY: 'VILLAIN', FAMILIAR: 'NEUTRAL', SERVANT: 'NEUTRAL', OTHER: 'NEUTRAL' }
const AVS = ['linear-gradient(135deg,#3a6a4a,#1e3a28)', 'linear-gradient(135deg,#7a4a14,#3a2208)', 'linear-gradient(135deg,#5a1a2e,#2a0a16)', 'linear-gradient(135deg,#6a5a3a,#2e2618)']
const json = (url: string, method: string, body?: unknown) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).catch(() => null)

export function useNpcsVals(d: NpcsDados) {
  const router = useRouter()
  const api = `/api/campaigns/${d.campaignId}`
  const gm = d.souMestre
  const [folder, setFolder] = useState('all')
  const [sel, setSel] = useState<string | null>(d.selInicial)
  const [folders, setFolders] = useState(d.pastas)
  const [where, setWhere] = useState<Record<string, string | null>>({})
  // Visível para um jogador = isPublic ou NPCVisibility.canView (como no resto do app).
  const [vis, setVis] = useState<Record<string, Record<string, boolean>>>(() => Object.fromEntries(d.npcs.map(n => [n.id, Object.fromEntries(d.jogadores.map(j => [j.memberId, n.publico || n.vis.includes(j.memberId)]))])))
  const [publico, setPublico] = useState<Record<string, boolean>>(() => Object.fromEntries(d.npcs.map(n => [n.id, n.publico])))
  const [hp, setHp] = useState<Record<string, number>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [confirm, setConfirm] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const folderOf = (n: NpcsDados['npcs'][number]) => (n.id in where ? where[n.id] : n.folderId)
  const fIds = folders.map(f => f.id)
  const visibleTo = (id: string) => Object.values(vis[id] ?? {}).filter(Boolean).length
  const list = d.npcs.filter(n => !gm || folder === 'all' || (folder === 'none' ? !fIds.includes(folderOf(n) ?? '') : folderOf(n) === folder))
  const selRaw = d.npcs.find(n => n.id === sel) ?? list[0] ?? null
  const id = selRaw?.id ?? ''
  const max = selRaw?.max || 1
  const hpAtual = selRaw ? hp[selRaw.id] ?? selRaw.hp : 0
  const count = (k: string) => d.npcs.filter(n => (k === 'all' ? true : k === 'none' ? !fIds.includes(folderOf(n) ?? '') : folderOf(n) === k)).length

  const renomear = (k: string) => {
    const nome = draft.trim(); setEditing(null)
    if (!nome) return
    setFolders(fs => fs.map(f => (f.id === k ? { ...f, n: nome } : f)))
    void json(`${api}/npc-folders/${k}`, 'PATCH', { name: nome })
  }
  const folderRow = (k: string, n: string, icon: LucideIcon, custom: boolean) => ({
    n, icon, count: count(k), custom, editing: editing === k, idle: editing !== k, draft, confirm: confirm === k,
    go: () => setFolder(k), bg: folder === k ? 'var(--surface2)' : 'transparent', mark: folder === k ? 'inset 3px 0 0 var(--accent)' : 'none', color: folder === k ? 'var(--ink)' : 'var(--muted)',
    rename: () => { setEditing(k); setDraft(n); setConfirm(null) }, onDraft: (e: ChangeEvent<HTMLInputElement>) => setDraft(e.target.value),
    commit: () => renomear(k),
    onKey: (e: KeyboardEvent) => { if (e.key === 'Enter') renomear(k); if (e.key === 'Escape') setEditing(null) },
    del: () => { setConfirm(k); setEditing(null) }, cancelDel: () => setConfirm(null),
    // Apagar a pasta manda os NPCs para "Sem pasta" (onDelete: SetNull).
    doDel: () => { setFolders(fs => fs.filter(f => f.id !== k)); setConfirm(null); if (folder === k) setFolder('all'); void json(`${api}/npc-folders/${k}`, 'DELETE') },
  })
  const addFolder = async () => {
    const nome = newName.trim(); setCreating(false); setNewName('')
    if (!nome) return
    const r = await json(`${api}/npc-folders`, 'POST', { name: nome })
    const f = r?.ok ? await r.json().catch(() => null) as { id?: string } | null : null
    if (f?.id) setFolders(fs => [...fs, { id: f.id!, n: nome }])
  }
  const mudarHp = (delta: number) => {
    if (!selRaw) return
    const v = Math.max(0, Math.min(max, hpAtual + delta))
    setHp(h => ({ ...h, [selRaw.id]: v }))
    void json(`${api}/npcs/${selRaw.id}`, 'PATCH', { hp: v })
  }
  const setPara = async (memberId: string, on: boolean) => {
    if (!selRaw) return
    const atual = vis[id] ?? {}
    // Se estava público para todos, passa a valer por jogador.
    if (publico[id]) {
      setPublico(p => ({ ...p, [id]: false }))
      await json(`${api}/npcs/${id}`, 'PATCH', { isPublic: false })
      await Promise.all(d.jogadores.filter(j => j.memberId !== memberId && atual[j.memberId]).map(j => json(`${api}/npcs/${id}/visibility`, 'PATCH', { memberId: j.memberId, canView: true })))
    }
    setVis(v => ({ ...v, [id]: { ...(v[id] ?? {}), [memberId]: on } }))
    await json(`${api}/npcs/${id}/visibility`, 'PATCH', { memberId, canView: on })
  }
  const allOn = !!selRaw && d.jogadores.length > 0 && d.jogadores.every(j => vis[id]?.[j.memberId])

  return {
    $href: (link: string) => dcHref(link, { campaignId: d.campaignId }),
    $img: (slot: string) => d.npcs.find(n => `npc-${n.id}` === slot)?.img ?? null,
    campanha: d.campanha, temVisao: false, isGM: gm,
    views: [] as { l: string; go: () => void; bg: string; color: string; sh: string }[],
    summary: gm ? `${d.npcs.length} NPCs · ${d.npcs.filter(n => visibleTo(n.id) === 0).length} ainda escondidos dos jogadores` : `${d.npcs.length} NPCs que o Mestre revelou para você`,
    folders: [folderRow('all', 'Todos os NPCs', Library, false), ...folders.map(f => folderRow(f.id, f.n, folder === f.id ? FolderOpen : Folder, true)), folderRow('none', 'Sem pasta', Inbox, false)],
    creating, startNew: () => { setCreating(true); setNewName('') }, newName, onNew: (e: ChangeEvent<HTMLInputElement>) => setNewName(e.target.value),
    onNewKey: (e: KeyboardEvent) => { if (e.key === 'Enter') void addFolder(); if (e.key === 'Escape') setCreating(false) }, addFolder: () => void addFolder(),
    npcs: list.map((n, k) => {
      const t = T[TIPO[n.type] ?? n.type] ?? T.NEUTRAL, v = visibleTo(n.id)
      return {
        n: n.n, type: t[0], typeBg: t[2], icon: t[1], cover: t[3], slot: `npc-${n.id}`, delay: (k * 0.04).toFixed(2),
        meta: gm ? `Nível ${n.lv} · ${folders.find(f => f.id === folderOf(n))?.n ?? 'Sem pasta'}` : `Nível ${n.lv}`,
        showVis: gm, visIcon: v ? Eye : EyeOff, visC: v ? '#8fbf6a' : '#bba98a', visT: v ? `Visível para ${v} jogador(es)` : 'Escondido dos jogadores',
        go: () => { setSel(n.id); window.history.replaceState(null, '', `?npc=${n.id}`) },
        ring: id === n.id ? '0 0 0 2px var(--accent), 0 16px 28px -18px rgb(60 30 10/.6)' : 'none', tf: id === n.id ? 'translateY(-3px)' : 'none',
      }
    }),
    noNpcs: list.length === 0, emptyText: gm ? 'Nenhum NPC nesta pasta. Escolha uma pasta no detalhe de um NPC para movê-lo para cá.' : 'O Mestre ainda não revelou nenhum NPC para você.',
    hasSel: !!selRaw,
    sel: selRaw ? (() => { const t = T[TIPO[selRaw.type] ?? selRaw.type] ?? T.NEUTRAL; return { n: selRaw.n, type: t[0], icon: t[1], cover: t[3], lv: selRaw.lv, max, d: selRaw.d, slot: `npc-${selRaw.id}`, attrs: selRaw.attrs } })() : null!,
    fichaHref: selRaw ? `/campaign/${d.campaignId}/npcs/${selRaw.id}` : '#',
    hp: hpAtual, hpPct: Math.round(hpAtual / max * 100), hpColor: hpAtual / max < 0.35 ? 'var(--blood)' : 'var(--ok)',
    hpBtns: ([[-5, '−5'], [-1, '−1'], [1, '+1'], [5, '+5']] as const).map(([dd, l]) => ({ l, go: () => mudarHp(dd), bg: dd < 0 ? 'color-mix(in oklab, var(--blood) 12%, transparent)' : 'color-mix(in oklab, var(--ok) 14%, transparent)', color: dd < 0 ? 'var(--blood)' : 'var(--ok)' })),
    vis: d.jogadores.map((j, k) => {
      const on = !!vis[id]?.[j.memberId]
      return { u: j.u, i: j.u.charAt(0).toUpperCase(), av: AVS[k % AVS.length], sw: { on, l: `Visível para @${j.u}`, go: () => void setPara(j.memberId, !on), track: on ? 'var(--accent)' : 'var(--line)', knob: on ? '21px' : '3px' } }
    }),
    revealLabel: allOn ? 'Esconder de todos' : 'Revelar a todos',
    revealAll: async () => {
      if (!selRaw) return
      const v = !allOn
      setPublico(p => ({ ...p, [id]: v })); setVis(x => ({ ...x, [id]: Object.fromEntries(d.jogadores.map(j => [j.memberId, v])) }))
      await json(`${api}/npcs/${id}`, 'PATCH', { isPublic: v })
      if (!v) await Promise.all(d.jogadores.map(j => json(`${api}/npcs/${id}/visibility`, 'PATCH', { memberId: j.memberId, canView: false })))
      router.refresh()
    },
    moveOpts: [...folders.map(f => [f.id, f.n] as [string | null, string]), [null, 'Sem pasta'] as [string | null, string]].map(([k, l]) => {
      const on = !!selRaw && (k === null ? !fIds.includes(folderOf(selRaw) ?? '') : folderOf(selRaw) === k)
      return { l, go: () => { if (!selRaw) return; setWhere(w => ({ ...w, [selRaw.id]: k })); void json(`${api}/npcs/${selRaw.id}`, 'PATCH', { folderId: k }) }, bg: on ? 'var(--ink)' : 'var(--surface)', color: on ? 'var(--bg)' : 'var(--ink)', ring: on ? 'var(--ink)' : 'var(--line)' }
    }),
  }
}

export type Vals = ReturnType<typeof useNpcsVals>
