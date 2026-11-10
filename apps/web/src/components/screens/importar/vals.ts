'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { FileCheck, Upload, type LucideIcon } from 'lucide-react'
import { dcHref } from '@/lib/dc-routes'

/**
 * Porte do renderVals() de SAGA Importar Ficha.dc.html sobre a importação que
 * já existe: POST /api/characters/import (lê o arquivo com IA) e
 * POST /api/characters com importedAttributes.
 */
type Extraido = { characterName: string | null; systemHint: string | null; attributes: { name: string; value: number | null }[] }
type Attr = { id: number; n: string; v: string }

const LIMITE = 5 * 1024 * 1024
const tamanho = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

export function useImportarVals(campanhas: { id: string; name: string }[]) {
  const router = useRouter()
  const [step, setStep] = useState<'upload' | 'read' | 'review' | 'done'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [err, setErr] = useState('')
  const [shake, setShake] = useState(0)
  const [read, setRead] = useState(0)
  const [name, setName] = useState('')
  const [sistema, setSistema] = useState('')
  const [camp, setCamp] = useState(campanhas.length ? 1 : 0)
  const [attrs, setAttrs] = useState<Attr[]>([])
  const [nextId, setNextId] = useState(1000)
  const [criado, setCriado] = useState<string | null>(null)
  const tt = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => tt.current.forEach(clearTimeout), [])

  const fail = (e: string) => { setErr(e); setShake(n => n + 1) }
  const pick = (f: File) => {
    if (f.size > LIMITE) { setFile(null); return fail(`${f.name} tem ${tamanho(f.size)}. O limite é 5 MB: tente exportar a ficha sem imagens.`) }
    if (!/\.(pdf|html?)$/i.test(f.name) && !/pdf|html/.test(f.type)) { setFile(null); return fail('Só dá para importar PDF ou HTML. Imagens soltas ainda não são lidas.') }
    setFile(f); setErr('')
  }
  const pickMain = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.pdf,.html,.htm,application/pdf,text/html'
    input.onchange = () => { const f = input.files?.[0]; if (f) pick(f) }
    input.click()
  }

  const extract = async () => {
    if (!file) return
    setStep('read'); setRead(0)
    ;[1, 2, 3].forEach(k => tt.current.push(setTimeout(() => setRead(r => Math.max(r, k)), k * 750)))
    const fd = new FormData(); fd.append('file', file)
    const [r] = await Promise.all([fetch('/api/characters/import', { method: 'POST', body: fd }).catch(() => null), new Promise(res => setTimeout(res, 2700))])
    const x = r?.ok ? await r.json().catch(() => null) as Extraido | null : null
    if (!x) {
      const e = r ? await r.json().catch(() => null) as { error?: string } | null : null
      setStep('upload'); return fail(e?.error ?? 'Não foi possível concluir agora. Tente de novo.')
    }
    setName(x.characterName ?? ''); setSistema(x.systemHint ?? '')
    setAttrs(x.attributes.map((a, i) => ({ id: i, n: a.name, v: a.value == null ? '' : String(a.value) })))
    setStep('review')
  }

  const save = async () => {
    if (!name.trim()) return fail('Dê um nome ao personagem antes de criar.')
    const c = camp > 0 ? campanhas[camp - 1] : null
    // A ficha pertence a uma participação na campanha (sem "nenhuma" por enquanto).
    if (!c) return fail('Escolha uma campanha: por enquanto toda ficha vive numa campanha.')
    const r = await fetch('/api/characters', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: c.id, name: name.trim(), systemName: sistema.trim() || undefined, importedAttributes: attrs.filter(a => a.n.trim()).map(a => ({ name: a.n.trim(), value: a.v === '' ? 0 : +a.v })) }),
    }).catch(() => null)
    const ch = r?.ok ? await r.json().catch(() => null) as { id?: string } | null : null
    if (!ch?.id) {
      const e = r ? await r.json().catch(() => null) as { error?: string } | null : null
      return fail(e?.error ?? 'Não foi possível concluir agora. Tente de novo.')
    }
    setCriado(ch.id); setStep('done'); setErr(''); router.refresh()
  }

  const idx = { upload: 0, read: 1, review: 2, done: 3 }[step]
  const miss = attrs.filter(a => a.v === '').length
  const camps = ['Nenhuma', ...campanhas.map(c => c.name)]
  const setAttr = (id: number, k: 'n' | 'v', val: string) => setAttrs(xs => xs.map(a => (a.id === id ? { ...a, [k]: k === 'v' ? val.replace(/[^0-9-]/g, '').slice(0, 3) : val } : a)))
  const dzIcon: LucideIcon = file ? FileCheck : Upload

  return {
    $href: (link: string) => dcHref(link, { characterId: criado ?? undefined }),
    modalW: step === 'review' ? '620px' : '520px',
    title: step === 'done' ? 'Ficha importada' : 'Importar ficha',
    sub: file ? `${file.name} · ${tamanho(file.size)}` : 'PDF ou HTML · até 5 MB',
    steps: ['Arquivo', 'Leitura', 'Revisão'].map((l, i) => ({ l, n: idx > i ? '✓' : i + 1, sep: i < 2 ? 'block' : 'none', bg: idx > i ? 'var(--ok)' : idx === i ? 'var(--accent)' : 'var(--surface2)', fg: idx >= i ? '#fff8f0' : 'var(--muted)', color: idx === i ? 'var(--ink)' : 'var(--muted)' })),
    sUpload: step === 'upload', sRead: step === 'read', sReview: step === 'review', sDone: step === 'done',
    shake: shake ? `${shake % 2 ? 'importar-shakeA' : 'importar-shakeB'} .45s both` : 'none',
    pickMain,
    dzRing: file ? 'var(--ok)' : err ? 'var(--blood)' : 'var(--line)', dzBg: file ? 'color-mix(in oklab, var(--ok) 7%, transparent)' : 'var(--surface2)', dzIc: file ? 'var(--ok)' : 'var(--accent)', dzIcon,
    dzTitle: file ? file.name : 'Arraste a ficha aqui ou clique para escolher', dzSub: file ? `${tamanho(file.size)} · clique para trocar` : 'PDF ou HTML exportado de outro site · até 5 MB',
    temExemplos: false, samples: [] as { n: string; size: string; icon: LucideIcon; go: () => void; ring: string }[],
    err, noFile: !file, goOp: file ? 1 : 0.45, extract: () => void extract(),
    scanY: [0, 30, 62, 90][read] ?? 90,
    readSteps: ['Lendo o arquivo', 'Procurando nome e sistema', 'Separando atributos e valores'].map((l, i) => ({ l, done: read > i, color: read > i ? 'var(--ok)' : read === i ? 'var(--ink)' : 'var(--muted)', anim: read === i ? 'importar-pulse 1.2s infinite' : 'none' })),
    name, onName: (e: ChangeEvent<HTMLInputElement>) => { setName(e.target.value); setErr('') }, nameRing: !name.trim() && err ? 'var(--blood)' : 'var(--line)',
    sistemaDetectado: sistema || 'Não identificado', temConfianca: false,
    camps: camps.map((l, i) => ({ l, go: () => setCamp(i), bg: camp === i ? 'var(--surface)' : 'transparent', color: camp === i ? 'var(--ink)' : 'var(--muted)', sh: camp === i ? '0 1px 2px rgb(0 0 0/.1)' : 'none' })),
    attrLine: miss ? `${attrs.length} encontrados · ${miss} sem valor` : `${attrs.length} encontrados`,
    attrs: attrs.map((a, i) => ({
      ...a, delay: (i * 0.03).toFixed(2), miss: a.v === '', ring: a.v === '' ? 'var(--accent)' : 'var(--line)', bg: a.v === '' ? 'var(--accent-t)' : 'var(--surface)',
      onN: (e: ChangeEvent<HTMLInputElement>) => setAttr(a.id, 'n', e.target.value), onV: (e: ChangeEvent<HTMLInputElement>) => setAttr(a.id, 'v', e.target.value),
      del: () => setAttrs(xs => xs.filter(x => x.id !== a.id)),
    })),
    addAttr: () => { setAttrs(xs => [...xs, { id: nextId, n: 'Novo atributo', v: '' }]); setNextId(n => n + 1) },
    back: () => { setStep('upload'); setFile(null); setErr('') },
    save: () => void save(),
    doneLine: `${attrs.length} atributos importados${camp ? ` · em ${camps[camp]}` : ' · sem campanha por enquanto'}${miss ? ` · ${miss} ficaram em 0` : ''}`,
  }
}

export type Vals = ReturnType<typeof useImportarVals>
