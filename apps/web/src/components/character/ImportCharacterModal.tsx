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
        className="flex-1 px-2 py-1.5 rounded text-xs bg-parchment/60 border border-ink/20 text-ink focus:outline-none focus:border-wax"
      />
      <input
        type="number"
        min={0}
        max={99}
        value={attr.value ?? ''}
        placeholder="–"
        onChange={e => onChange(attr.id, 'value', e.target.value)}
        className="w-14 px-2 py-1.5 rounded text-xs text-center bg-parchment/60 border border-ink/20 text-ink focus:outline-none focus:border-wax"
      />
      <button
        onClick={() => onRemove(attr.id)}
        className="opacity-0 group-hover/row:opacity-100 text-ink-soft hover:text-wax transition-all"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="parchment-card w-full max-w-md rounded-xl overflow-hidden text-ink">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink/10">
          <h2 className="font-cinzel text-base font-bold text-ink">Importar Ficha</h2>
          <button onClick={handleClose} className="text-ink-soft hover:text-wax transition-colors">
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
                ? 'border-wax/60 bg-wax/5'
                : file
                  ? 'border-green-600/50 bg-green-600/5'
                  : 'border-ink/25 hover:border-wax hover:bg-ink/[0.03]'
            }`}
          >
            {file ? (
              <>
                <FileText size={28} className="text-green-700" />
                <p className="text-sm font-medium text-green-800">{file.name}</p>
                <p className="text-[11px] text-ink-soft">{(file.size / 1024).toFixed(0)} KB · clique para trocar</p>
              </>
            ) : (
              <>
                <Upload size={28} className="text-wax" />
                <p className="text-sm text-ink-soft font-cormorant">Arraste ou clique para selecionar</p>
                <p className="text-[11px] text-ink-soft">PDF ou HTML · máx 5 MB</p>
              </>
            )}
            <input
              ref={fileRef} type="file" accept=".pdf,.html,.htm"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f) }}
            />
          </div>

          {/* Notice */}
          <div className="flex gap-2.5 p-3 rounded-lg text-[11px] text-ink-soft leading-relaxed bg-gold/[0.08] border border-gold/25">
            <Info size={13} className="text-wax shrink-0 mt-0.5" />
            <span>
              A IA extrai os atributos automaticamente, mas o resultado <strong className="text-ink">pode precisar de ajustes manuais</strong> — especialmente em PDFs com layout complexo ou fichas escaneadas.
            </span>
          </div>

          {error && (
            <div className="flex gap-2 p-3 rounded-lg text-[11px] text-wax bg-wax/5 border border-wax/25">
              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleClose}
              className="flex-1 py-2 rounded-lg text-sm border border-ink/20 text-ink-soft hover:text-ink hover:border-wax transition-all">
              Cancelar
            </button>
            <button
              onClick={handleExtract}
              disabled={!file || loading}
              className="flex-1 py-2 rounded-lg text-sm font-cinzel transition-all disabled:opacity-40 flex items-center justify-center gap-2 bg-wax text-parchment hover:bg-wax-deep shadow-sm"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="parchment-card w-full max-w-lg rounded-xl flex flex-col max-h-[90vh] text-ink">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink/10 shrink-0">
          <div>
            <h2 className="font-cinzel text-base font-bold text-ink">Revisar Importação</h2>
            <p className="text-[11px] text-ink-soft mt-0.5">{file?.name}</p>
          </div>
          <button onClick={handleClose} className="text-ink-soft hover:text-wax transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {/* Warning banner */}
          <div className="flex gap-2.5 p-3 rounded-lg text-[11px] text-ink-soft leading-relaxed bg-gold/[0.08] border border-gold/25">
            <AlertTriangle size={13} className="text-wax shrink-0 mt-0.5" />
            <span>
              Revise os dados abaixo antes de salvar. Valores que a IA não conseguiu ler aparecem em branco — você pode preenchê-los manualmente.
            </span>
          </div>

          {/* Character name */}
          <div>
            <label className="block text-[10px] font-bold text-wax uppercase tracking-widest mb-1.5">Nome do Personagem *</label>
            <input
              value={charName}
              onChange={e => setCharName(e.target.value)}
              placeholder="Nome do personagem"
              className="w-full px-3 py-2 rounded-lg text-sm bg-parchment/60 border border-ink/20 text-ink placeholder:text-ink-soft/60 focus:outline-none focus:border-wax"
            />
          </div>

          {/* System + Campaign */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-wax uppercase tracking-widest mb-1.5">Sistema detectado</label>
              <input
                value={systemHint}
                onChange={e => setSystemHint(e.target.value)}
                placeholder="Ex: D&D 5e"
                className="w-full px-3 py-2 rounded-lg text-xs bg-parchment/60 border border-ink/20 text-ink placeholder:text-ink-soft/60 focus:outline-none focus:border-wax"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-wax uppercase tracking-widest mb-1.5">Campanha <span className="text-ink-soft/60 normal-case">(opcional)</span></label>
              <select
                value={campaignId}
                onChange={e => setCampaignId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs bg-parchment/60 border border-ink/20 text-ink focus:outline-none focus:border-wax appearance-none"
              >
                <option value="">Nenhuma</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Attributes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] font-bold text-wax uppercase tracking-widest">
                Atributos extraídos <span className="text-ink-soft/60">({attrs.length})</span>
              </label>
              <div className="flex gap-2 text-[10px] text-ink-soft">
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
                className="mt-2 flex items-center gap-1 text-[11px] text-ink-soft hover:text-wax transition-colors"
              >
                {showAll ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showAll ? 'Mostrar menos' : `Ver mais ${attrs.length - 12} atributos`}
              </button>
            )}
            {attrs.length === 0 && (
              <p className="text-[11px] text-ink-soft italic">Nenhum atributo encontrado.</p>
            )}
          </div>

          {error && (
            <div className="flex gap-2 p-3 rounded-lg text-[11px] text-wax bg-wax/5 border border-wax/25">
              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-ink/10 shrink-0">
          <button onClick={() => { setStep('upload'); setError('') }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs border border-ink/20 text-ink-soft hover:text-ink hover:border-wax transition-all">
            ← Voltar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 rounded-lg text-sm font-cinzel transition-all disabled:opacity-40 flex items-center justify-center gap-2 bg-wax text-parchment hover:bg-wax-deep shadow-sm"
          >
            {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : <><Check size={14} /> Criar Personagem</>}
          </button>
        </div>
      </div>
    </div>
  )
}
