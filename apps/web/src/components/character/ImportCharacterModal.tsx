'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  X, Upload, FileText, Loader2, AlertTriangle,
  Check, Trash2, ChevronDown, ChevronUp, Info,
} from 'lucide-react'

interface ExtractedAttr { name: string; value: number | null }
interface ExtractResult {
  characterName: string | null
  systemHint: string | null
  attributes: ExtractedAttr[]
}
interface Campaign { id: string; name: string }

interface Props {
  open: boolean
  onClose: () => void
  campaigns: Campaign[]
}

type Step = 'upload' | 'review'

// ─── helpers ─────────────────────────────────────────────────────────────────

function AttrRow({
  attr, onChange, onRemove,
}: {
  attr: ExtractedAttr & { id: number }
  onChange: (id: number, field: 'name' | 'value', val: string) => void
  onRemove: (id: number) => void
}) {
  return (
    <div className="flex items-center gap-2 group/row">
      <input
        value={attr.name}
        onChange={e => onChange(attr.id, 'name', e.target.value)}
        className="flex-1 px-2 py-1.5 rounded text-xs border"
        style={{ background: '#0a0a14', borderColor: 'rgba(255,255,255,0.12)', color: 'inherit', outline: 'none' }}
      />
      <input
        type="number"
        min={0}
        max={99}
        value={attr.value ?? ''}
        placeholder="–"
        onChange={e => onChange(attr.id, 'value', e.target.value)}
        className="w-14 px-2 py-1.5 rounded text-xs border text-center"
        style={{ background: '#0a0a14', borderColor: 'rgba(255,255,255,0.12)', color: 'inherit', outline: 'none' }}
      />
      <button
        onClick={() => onRemove(attr.id)}
        className="opacity-0 group-hover/row:opacity-100 text-saga-dim hover:text-saga-danger transition-all"
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function ImportCharacterModal({ open, onClose, campaigns }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // review state
  const [charName, setCharName] = useState('')
  const [systemHint, setSystemHint] = useState('')
  const [campaignId, setCampaignId] = useState('')
  const [attrs, setAttrs] = useState<(ExtractedAttr & { id: number })[]>([])
  const [showAll, setShowAll] = useState(false)
  const [saving, setSaving] = useState(false)

  if (!open) return null

  function reset() {
    setStep('upload'); setFile(null); setError(''); setLoading(false)
    setCharName(''); setSystemHint(''); setCampaignId(''); setAttrs([])
  }

  function handleClose() { reset(); onClose() }

  function pickFile(f: File) {
    setFile(f); setError('')
  }

  async function handleExtract() {
    if (!file) return
    setLoading(true); setError('')
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/characters/import', { method: 'POST', body: fd })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string }
      setError(data.error ?? 'Erro ao processar o arquivo.')
      return
    }
    const data = await res.json() as ExtractResult
    setCharName(data.characterName ?? '')
    setSystemHint(data.systemHint ?? '')
    setAttrs(data.attributes.map((a, i) => ({ ...a, id: i })))
    setStep('review')
  }

  function attrChange(id: number, field: 'name' | 'value', val: string) {
    setAttrs(prev => prev.map(a =>
      a.id !== id ? a :
      field === 'value' ? { ...a, value: val === '' ? null : parseInt(val, 10) } :
      { ...a, name: val }
    ))
  }

  async function handleSave() {
    if (!charName.trim()) { setError('Nome do personagem é obrigatório.'); return }
    setSaving(true); setError('')

    // 1. Create character
    const charRes = await fetch('/api/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: charName.trim(),
        campaignId: campaignId || undefined,
        systemName: systemHint?.trim() || undefined,
        importedAttributes: attrs
          .filter(a => a.name.trim())
          .map(a => ({ name: a.name.trim(), value: a.value ?? 0 })),
      }),
    })
    setSaving(false)
    if (!charRes.ok) {
      const data = await charRes.json().catch(() => ({})) as { error?: string }
      setError(data.error ?? 'Erro ao criar personagem.')
      return
    }
    const char = await charRes.json() as { id: string }
    handleClose()
    router.push(`/characters/${char.id}`)
  }

  const visibleAttrs = showAll ? attrs : attrs.slice(0, 12)

  // ─── Upload step ────────────────────────────────────────────────────────────

  if (step === 'upload') return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-md rounded-xl border shadow-2xl overflow-hidden"
           style={{ background: '#12121f', borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <h2 className="font-cinzel text-base font-bold">Importar Ficha</h2>
          <button onClick={handleClose} className="text-saga-muted hover:text-saga-text transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) pickFile(f) }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-all ${
              dragging
                ? 'border-gold/60 bg-gold/5'
                : file
                  ? 'border-green-500/40 bg-green-500/5'
                  : 'border-border hover:border-border-bright hover:bg-white/2'
            }`}
          >
            {file ? (
              <>
                <FileText size={28} className="text-green-400" />
                <p className="text-sm font-medium text-green-400">{file.name}</p>
                <p className="text-[11px] text-saga-dim">{(file.size / 1024).toFixed(0)} KB · clique para trocar</p>
              </>
            ) : (
              <>
                <Upload size={28} className="text-saga-dim" />
                <p className="text-sm text-saga-muted">Arraste ou clique para selecionar</p>
                <p className="text-[11px] text-saga-dim">PDF ou HTML · máx 5 MB</p>
              </>
            )}
            <input
              ref={fileRef} type="file" accept=".pdf,.html,.htm"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f) }}
            />
          </div>

          {/* Notice */}
          <div className="flex gap-2.5 p-3 rounded-lg text-[11px] text-saga-muted leading-relaxed"
               style={{ background: 'rgba(201,162,42,0.06)', border: '1px solid rgba(201,162,42,0.18)' }}>
            <Info size={13} className="text-gold shrink-0 mt-0.5" />
            <span>
              A IA extrai os atributos automaticamente, mas o resultado <strong className="text-saga-text">pode precisar de ajustes manuais</strong> — especialmente em PDFs com layout complexo ou fichas escaneadas.
            </span>
          </div>

          {error && (
            <div className="flex gap-2 p-3 rounded-lg text-[11px] text-saga-danger" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleClose}
              className="flex-1 py-2 rounded-lg text-sm border border-border text-saga-muted hover:text-saga-text hover:border-border-bright transition-all">
              Cancelar
            </button>
            <button
              onClick={handleExtract}
              disabled={!file || loading}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: 'rgba(201,162,42,0.15)', border: '1px solid rgba(201,162,42,0.4)', color: '#c9a22a' }}
            >
              {loading ? <><Loader2 size={14} className="animate-spin" /> Analisando...</> : 'Extrair Atributos'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ─── Review step ────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-lg rounded-xl border shadow-2xl flex flex-col max-h-[90vh]"
           style={{ background: '#12121f', borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div>
            <h2 className="font-cinzel text-base font-bold">Revisar Importação</h2>
            <p className="text-[11px] text-saga-dim mt-0.5">{file?.name}</p>
          </div>
          <button onClick={handleClose} className="text-saga-muted hover:text-saga-text transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {/* Warning banner */}
          <div className="flex gap-2.5 p-3 rounded-lg text-[11px] text-saga-muted leading-relaxed"
               style={{ background: 'rgba(201,162,42,0.06)', border: '1px solid rgba(201,162,42,0.18)' }}>
            <AlertTriangle size={13} className="text-gold shrink-0 mt-0.5" />
            <span>
              Revise os dados abaixo antes de salvar. Valores que a IA não conseguiu ler aparecem em branco — você pode preenchê-los manualmente.
            </span>
          </div>

          {/* Character name */}
          <div>
            <label className="block text-[10px] font-bold text-saga-dim uppercase tracking-widest mb-1.5">Nome do Personagem *</label>
            <input
              value={charName}
              onChange={e => setCharName(e.target.value)}
              placeholder="Nome do personagem"
              className="w-full px-3 py-2 rounded-lg text-sm border"
              style={{ background: '#0a0a14', borderColor: 'rgba(255,255,255,0.12)', color: 'inherit', outline: 'none' }}
            />
          </div>

          {/* System + Campaign */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-saga-dim uppercase tracking-widest mb-1.5">Sistema detectado</label>
              <input
                value={systemHint}
                onChange={e => setSystemHint(e.target.value)}
                placeholder="Ex: D&D 5e"
                className="w-full px-3 py-2 rounded-lg text-xs border"
                style={{ background: '#0a0a14', borderColor: 'rgba(255,255,255,0.12)', color: 'inherit', outline: 'none' }}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-saga-dim uppercase tracking-widest mb-1.5">Campanha <span className="text-saga-dim/50">(opcional)</span></label>
              <select
                value={campaignId}
                onChange={e => setCampaignId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs border appearance-none"
                style={{ background: '#0a0a14', borderColor: 'rgba(255,255,255,0.12)', color: campaignId ? 'inherit' : '#666', outline: 'none' }}
              >
                <option value="">Nenhuma</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Attributes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] font-bold text-saga-dim uppercase tracking-widest">
                Atributos extraídos <span className="text-saga-dim/50">({attrs.length})</span>
              </label>
              <div className="flex gap-2 text-[10px] text-saga-dim">
                <span>Nome</span>
                <span className="w-14 text-center">Valor</span>
                <span className="w-4" />
              </div>
            </div>
            <div className="space-y-1.5">
              {visibleAttrs.map(attr => (
                <AttrRow
                  key={attr.id}
                  attr={attr}
                  onChange={attrChange}
                  onRemove={id => setAttrs(prev => prev.filter(a => a.id !== id))}
                />
              ))}
            </div>
            {attrs.length > 12 && (
              <button
                onClick={() => setShowAll(p => !p)}
                className="mt-2 flex items-center gap-1 text-[11px] text-saga-dim hover:text-saga-text transition-colors"
              >
                {showAll ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showAll ? 'Mostrar menos' : `Ver mais ${attrs.length - 12} atributos`}
              </button>
            )}
            {attrs.length === 0 && (
              <p className="text-[11px] text-saga-dim italic">Nenhum atributo encontrado.</p>
            )}
          </div>

          {error && (
            <div className="flex gap-2 p-3 rounded-lg text-[11px] text-saga-danger" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <button onClick={() => { setStep('upload'); setError('') }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs border border-border text-saga-muted hover:text-saga-text hover:border-border-bright transition-all">
            ← Voltar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: 'rgba(201,162,42,0.15)', border: '1px solid rgba(201,162,42,0.4)', color: '#c9a22a' }}
          >
            {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : <><Check size={14} /> Criar Personagem</>}
          </button>
        </div>
      </div>
    </div>
  )
}
