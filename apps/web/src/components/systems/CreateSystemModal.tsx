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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
      <div className="parchment-card w-full max-w-md rounded-xl overflow-hidden text-ink">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink/10">
          <h2 className="font-cinzel text-base font-bold text-ink">Criar Sistema</h2>
          <button onClick={onClose} className="text-ink-soft hover:text-wax transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-wax mb-1.5">Nome *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Meu Sistema Homebrew"
              maxLength={100}
              className="w-full px-3 py-2 rounded-lg text-sm bg-parchment/60 border border-ink/20 text-ink placeholder:text-ink-soft/60 focus:outline-none focus:border-wax transition-colors"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-wax mb-1.5">Categoria</label>
            <div className="grid grid-cols-3 gap-1.5">
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-cinzel tracking-wide border transition-all ${
                    category === c.id
                      ? 'bg-wax text-parchment border-wax-deep'
                      : 'bg-parchment/50 border-ink/20 text-ink-soft hover:border-wax hover:text-wax'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-wax mb-1.5">Descrição</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Uma breve descrição do sistema..."
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm bg-parchment/60 border border-ink/20 text-ink placeholder:text-ink-soft/60 resize-none focus:outline-none focus:border-wax transition-colors font-cormorant"
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-wax mb-1.5">URL da capa <span className="text-ink-soft normal-case">(opcional)</span></label>
            <input
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 rounded-lg text-sm bg-parchment/60 border border-ink/20 text-ink placeholder:text-ink-soft/60 focus:outline-none focus:border-wax transition-colors"
            />
          </div>

          {error && <p className="text-xs text-wax">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm border border-ink/20 text-ink-soft hover:text-ink hover:border-wax transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-lg text-sm font-cinzel transition-all disabled:opacity-50 flex items-center justify-center gap-2 bg-wax text-parchment hover:bg-wax-deep shadow-sm"
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
