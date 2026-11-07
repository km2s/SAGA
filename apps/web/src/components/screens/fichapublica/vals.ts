'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Globe, Link as LinkIcon, Lock } from 'lucide-react'
import { dcHref } from '@/lib/dc-routes'
import { toggleTema } from '@/lib/tema'

/** Dados de /ficha/[id] (app/ficha/[id]/page.tsx). `null` = ficha que o visitante não pode ver. */
export type FichaPublicaDados = {
  id: string; dono: boolean; publica: boolean
  nome: string; sub: string; nivel: string; campanha: string; sistema: string; img: string | null
  tracks: { n: string; v: number; max: number; color: string }[]
  attrs: { n: string; v: number; fantasia: boolean }[]
} | null

export function useFichaPublicaVals(d: FichaPublicaDados) {
  const [pub, setPub] = useState(d?.publica ?? false)
  const [copied, setCopied] = useState(false)
  const [url, setUrl] = useState('')
  const t = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => { setUrl(window.location.href); return () => clearTimeout(t.current) }, [])
  const owner = !!d?.dono
  const mod = (v: number) => { const m = Math.floor((v - 10) / 2); return (m >= 0 ? '+' : '') + m }

  return {
    $href: (link: string) => dcHref(link, { characterId: d?.id }),
    $img: (id: string) => (id === 'pers-retrato-2' ? d?.img ?? null : null), // TODO(api): capa da campanha ('pub-capa')
    toggleTema,
    isOwner: owner, pub, visible: !!d && (pub || owner), hidden: !d || (!pub && !owner),
    ownerBg: pub ? 'color-mix(in oklab, var(--ok) 9%, var(--bg))' : 'var(--surface2)', ownerColor: pub ? 'var(--ok)' : 'var(--muted)', ownerIcon: pub ? Globe : Lock,
    ownerTitle: pub ? 'Você está vendo sua ficha como os visitantes veem' : 'Ficha privada: só você e o Mestre da campanha a veem',
    ownerSub: pub ? 'Quem tiver o link vê retrato, recursos e atributos. Notas e inventário ficam de fora.' : 'Quem abrir o link verá a página de ficha selada.',
    swPub: {
      on: pub, l: 'Ficha pública', track: pub ? 'var(--accent)' : 'var(--line)', knob: pub ? '21px' : '3px',
      go: () => {
        if (!d) return
        const v = !pub; setPub(v); setCopied(false)
        void fetch(`/api/characters/${d.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isPublic: v }) }).catch(() => null)
      },
    },
    copy: () => {
      try { void navigator.clipboard?.writeText(url) } catch { /* sem clipboard */ }
      clearTimeout(t.current); setCopied(true); t.current = setTimeout(() => setCopied(false), 2000)
    },
    copyLabel: copied ? 'Copiado' : 'Copiar link', copyIcon: copied ? Check : LinkIcon, copyColor: copied ? 'var(--ok)' : 'var(--ink)', copyAnim: copied ? 'fichapublica-fadeIn .25s both' : 'none',
    linkCurto: url ? `${url.replace(/^https?:\/\//, '').slice(0, 24)}…` : '',
    nome: d?.nome ?? '', sub: d?.sub ?? '', nivel: d?.nivel ?? '', campanha: d?.campanha ?? '', sistema: d?.sistema ?? '',
    tracks: (d?.tracks ?? []).map(x => ({ ...x, pct: x.max > 0 ? Math.round(x.v / x.max * 100) : 0 })),
    // Modificador só nos sistemas de fantasia (d20); nos outros mostra o próprio valor.
    attrs: (d?.attrs ?? []).map(a => ({ n: a.n, v: a.v, m: a.fantasia ? mod(a.v) : String(a.v) })),
  }
}

export type Vals = ReturnType<typeof useFichaPublicaVals>
