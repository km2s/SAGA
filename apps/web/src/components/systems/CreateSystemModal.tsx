'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'

interface CreatedSystem {
  id: string; name: string; description: string | null; imageUrl: string | null
  category: string; isPreset: boolean; createdAt: Date | string
  creator: { username: string; discordId: string } | null
  attributes: { id: string; name: string; defaultDie: string; description: string | null }[]
}

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (system: CreatedSystem) => void
}

const CATEGORIES = [
  { id: 'fantasy',           label: 'Fantasia' },
  { id: 'world-of-darkness', label: 'Mundo das Trevas' },
  { id: 'horror',            label: 'Horror' },
  { id: 'scifi',             label: 'Sci-Fi' },
  { id: 'generic',           label: 'Genérico' },
  { id: 'custom',            label: 'Personalizado' },
]

export function CreateSystemModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('custom')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Nome é obrigatório.'); return }
    setLoading(true)
    const res = await fetch('/api/systems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), category, description: description.trim() || undefined, imageUrl: imageUrl.trim() || undefined }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string }
      setError(data.error ?? 'Erro ao criar sistema.')
      return
    }
    const system = await res.json() as CreatedSystem
    setName(''); setCategory('custom'); setDescription(''); setImageUrl(''); setError('')
    onCreated(system)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-xl border shadow-2xl overflow-hidden"
           style={{ background: '#12121f', borderColor: 'rgba(255,255,255,0.1)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <h2 className="font-cinzel text-base font-bold">Criar Sistema</h2>
          <button onClick={onClose} className="text-saga-muted hover:text-saga-text transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-saga-muted mb-1.5">Nome *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Meu Sistema Homebrew"
              maxLength={100}
              className="w-full px-3 py-2 rounded-lg text-sm border transition-colors"
              style={{ background: '#0d0d18', borderColor: 'rgba(255,255,255,0.12)', color: 'inherit', outline: 'none' }}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-saga-muted mb-1.5">Categoria</label>
            <div className="grid grid-cols-3 gap-1.5">
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border transition-all ${
                    category === c.id
                      ? 'bg-gold/12 border-gold/35 text-gold'
                      : 'border-border text-saga-muted hover:border-border-bright'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-saga-muted mb-1.5">Descrição</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Uma breve descrição do sistema..."
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm border resize-none transition-colors"
              style={{ background: '#0d0d18', borderColor: 'rgba(255,255,255,0.12)', color: 'inherit', outline: 'none' }}
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-xs font-medium text-saga-muted mb-1.5">URL da capa <span className="text-saga-dim">(opcional)</span></label>
            <input
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 rounded-lg text-sm border transition-colors"
              style={{ background: '#0d0d18', borderColor: 'rgba(255,255,255,0.12)', color: 'inherit', outline: 'none' }}
            />
          </div>

          {error && <p className="text-xs text-saga-danger">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm border border-border text-saga-muted hover:text-saga-text hover:border-border-bright transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'rgba(201,162,42,0.15)', border: '1px solid rgba(201,162,42,0.4)', color: '#c9a22a' }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              Criar Sistema
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
