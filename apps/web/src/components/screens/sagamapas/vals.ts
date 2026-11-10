'use client'

import { useState, type ChangeEvent } from 'react'
import { ExternalLink, Map as MapIcon } from 'lucide-react'
import { safeImageUrl } from '@/lib/safe-url'

/** SagaMapas: a lista de mapas da campanha (Mesa e Painel do Mestre › Mapas). */
export type MapaItem = { id: string; nome: string; colunas: number; linhas: number; escala: number; arte: number; imagemUrl: string | null }
export type SagaMapasProps = {
  campaignId: string; modo: 'mesa' | 'painel'
  mapas: MapaItem[]; naMesa: string; aberto?: string | null
  /** Maior coluna/linha (0-based) com token no mapa aberto: avisa antes de diminuir. */
  limite?: { x: number; y: number } | null
  onAbrir?: (id: string) => void; onClose?: () => void
  onChange?: (mapas: MapaItem[], naMesa: string) => void
}

const THUMB = ['linear-gradient(110deg,#d6bc86 45%,#7a9aa8 46% 52%,#d6bc86 53%)', 'linear-gradient(0deg,#d6bc86 38%,#7a9aa8 39% 61%,#d6bc86 62%)', 'radial-gradient(circle at 50% 45%,#b8a07a,#6a5a42 70%)', 'radial-gradient(circle at 30% 40%,#4e7a5a,#1e3a28)', 'linear-gradient(160deg,#5a5a6a,#26262e)']
/** Fundo da miniatura: a imagem do mapa ou uma arte de terreno. Também nas abas da Mesa. */
export const miniatura = (m: MapaItem) => { const img = safeImageUrl(m.imagemUrl); return img ? `url("${img.replace(/["\\]/g, '')}") center/cover` : THUMB[m.arte % THUMB.length]! }
const PRE: [string, number, number][] = [['Pequeno', 20, 15], ['Médio', 30, 20], ['Grande', 40, 30], ['Enorme', 60, 40]]
const ESC: [string, number, string][] = [['1,5 m', 1.5, 'm'], ['3 m', 3, 'm'], ['1,5 km', 1.5, 'km']]
const json = (url: string, method: string, body?: unknown) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).catch(() => null)

export function useSagaMapasVals(p: SagaMapasProps) {
  const api = `/api/campaigns/${p.campaignId}/mapas`
  const mesa = p.modo === 'mesa'
  const [edit, setEdit] = useState<string | null>(null)
  const [draft, setDraft] = useState<MapaItem | null>(null)
  const [del, setDel] = useState<string | null>(null)
  const [fresh, setFresh] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const maps = p.mapas, live = p.naMesa, open = p.aberto ?? null
  const muda = (mapas: MapaItem[], naMesa = live) => p.onChange?.(mapas, naMesa)
  const sizeTxt = (m: MapaItem) => { const e = ESC[m.escala] ?? ESC[0]!; return `${m.colunas} × ${m.linhas} quadrados · ${String(+(m.colunas * e[1]).toFixed(1)).replace('.', ',')} × ${String(+(m.linhas * e[1]).toFixed(1)).replace('.', ',')} ${e[2]}` }
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
  const d = draft

  const addMap = async () => {
    const r = await json(api, 'POST', {})
    const m = r?.ok ? await r.json().catch(() => null) as MapaItem | null : null
    if (!m) { setErro('Não foi possível criar o mapa.'); return }
    muda([...maps, m]); setFresh(m.id); setEdit(m.id); setDraft({ ...m }); setDel(null)
  }

  return {
    title: mesa ? 'Mapas da sessão' : 'Mapas da campanha',
    sub: erro || (mesa ? `${maps.length} mapa${maps.length === 1 ? '' : 's'} · troque, redimensione ou crie sem sair da mesa` : `${maps.length} mapa${maps.length === 1 ? '' : 's'} · prepare antes da sessão; eles aparecem nas abas da Mesa`),
    canClose: !!p.onClose, close: () => p.onClose?.(), minCol: mesa ? '100%' : '320px', addMap: () => { void addMap() },
    foot: mesa ? 'Os jogadores só veem o mapa marcado como "Na mesa". Você pode abrir outro para preparar sem que eles vejam.' : 'O mapa marcado como "Na mesa" é o que os jogadores veem quando a sessão começa.',
    cards: maps.map(m => {
      const isLive = live === m.id, isOpen = mesa && open === m.id, editing = edit === m.id, confirm = del === m.id, only = maps.length === 1
      const k = Math.min(88 / m.colunas, 64 / m.linhas)
      return {
        n: m.nome, size: sizeTxt(m), live: isLive, open: isOpen, editing, confirm, idle: !editing && !confirm,
        tw: Math.round(m.colunas * k), th: Math.round(m.linhas * k), gs: `${Math.max(2, k * 2).toFixed(1)}px`,
        thumb: miniatura(m),
        ring: isOpen ? 'var(--accent)' : isLive ? 'color-mix(in oklab, var(--blood) 40%, var(--line))' : 'var(--line)', sh: isOpen ? '0 0 0 3px var(--accent-t)' : 'none', anim: m.id === fresh ? 'sagamapas-popIn .3s both' : 'none',
        canOpen: !isOpen, openL: mesa ? 'Abrir' : 'Abrir na mesa', openIcon: mesa ? MapIcon : ExternalLink,
        abrir: () => p.onAbrir?.(m.id),
        canShow: !isLive,
        show: async () => {
          const r = await json(`${api}/${m.id}/na-mesa`, 'POST')
          if (!r?.ok) { setErro('Não foi possível mostrar este mapa.'); return }
          setErro(''); muda(maps, m.id)
        },
        edit: () => { setEdit(m.id); setDraft({ ...m }); setDel(null) },
        askDel: () => { setDel(m.id); setEdit(null) }, delC: only || isLive ? 'var(--muted)' : 'var(--blood)', delOp: only || isLive ? .6 : 1,
        delT: only ? 'Precisa existir pelo menos um mapa' : isLive ? 'Os jogadores estão vendo este mapa' : 'Excluir mapa',
        canDel: !only && !isLive, cancelL: !only && !isLive ? 'Manter' : 'Entendi',
        delMsg: only ? 'Este é o único mapa. Crie outro antes de excluir.' : isLive ? 'Os jogadores estão vendo este mapa. Mostre outro a eles antes de excluir.' : `Excluir “${m.nome}”? Os tokens e a névoa deste mapa somem junto.`,
        doDel: async () => {
          const r = await json(`${api}/${m.id}`, 'DELETE')
          if (!r?.ok) { setErro('Não foi possível excluir.'); return }
          setDel(null); muda(maps.filter(x => x.id !== m.id))
          if (isOpen) p.onAbrir?.(live)
        },
        cancel: () => setDel(null),
      }
    }),
    d: d ? {
      n: d.nome, onN: (e: ChangeEvent<HTMLInputElement>) => setDraft({ ...d, nome: e.target.value }),
      presets: [...PRE, ['Personalizado', 0, 0] as [string, number, number]].map(([l, c, r]) => {
        const on = c ? d.colunas === c && d.linhas === r : !PRE.some(x => x[1] === d.colunas && x[2] === d.linhas)
        return { l, s: c ? `${c}×${r}` : `${d.colunas}×${d.linhas}`, bg: on ? 'var(--ink)' : 'var(--surface)', color: on ? 'var(--bg)' : 'var(--ink)', ring: on ? 'var(--ink)' : 'var(--line)', go: () => { if (c) setDraft({ ...d, colunas: c, linhas: r }) } }
      }),
      steps: ([['Colunas', 'colunas', 10, 100], ['Linhas', 'linhas', 10, 80]] as const).map(([l, k, lo, hi]) => ({
        l, v: d[k], dn: () => setDraft({ ...d, [k]: clamp(d[k] - 1, lo, hi) }), up: () => setDraft({ ...d, [k]: clamp(d[k] + 1, lo, hi) }),
        on: (e: ChangeEvent<HTMLInputElement>) => { const v = parseInt(e.target.value, 10); setDraft({ ...d, [k]: isNaN(v) ? lo : clamp(v, lo, hi) }) },
      })),
      esc: ESC.map(([l], i) => ({ l, bg: d.escala === i ? 'var(--ink)' : 'transparent', color: d.escala === i ? 'var(--bg)' : 'var(--muted)', go: () => setDraft({ ...d, escala: i }) })),
      summary: `${sizeTxt(d)} · ${d.colunas * 40} × ${d.linhas * 40} px no zoom 100%`,
      warn: !!(p.limite && open === d.id && (p.limite.x >= d.colunas || p.limite.y >= d.linhas)),
      warnT: p.limite ? `Há tokens até a coluna ${p.limite.x + 1} e a linha ${p.limite.y + 1}. Eles serão movidos para a borda do mapa.` : '',
      cancel: () => { setEdit(null); setDraft(null) },
      save: async () => {
        const nome = d.nome.trim() || 'Mapa sem nome'
        const r = await json(`${api}/${d.id}`, 'PATCH', { nome, colunas: d.colunas, linhas: d.linhas, escala: d.escala })
        const m = r?.ok ? await r.json().catch(() => null) as MapaItem | null : null
        if (!m) { setErro('Não foi possível salvar o mapa.'); return }
        setErro(''); setEdit(null); setDraft(null); muda(maps.map(x => x.id === m.id ? m : x))
      },
    } : { n: '', onN: (_: ChangeEvent<HTMLInputElement>) => {}, presets: [] as { l: string; s: string; bg: string; color: string; ring: string; go: () => void }[], steps: [] as { l: string; v: number; dn: () => void; up: () => void; on: (e: ChangeEvent<HTMLInputElement>) => void }[], esc: [] as { l: string; bg: string; color: string; go: () => void }[], summary: '', warn: false, warnT: '', cancel: () => {}, save: async () => {} },
  }
}

export type Vals = ReturnType<typeof useSagaMapasVals>
