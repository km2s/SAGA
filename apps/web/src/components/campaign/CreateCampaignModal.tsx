'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface RPGSystem { id: string; name: string; category: string }

const CATEGORY_LABELS: Record<string, string> = {
  fantasy: 'Fantasia',
  'world-of-darkness': 'World of Darkness',
  horror: 'Horror',
  scifi: 'Sci-Fi / Cyberpunk',
  generic: 'Genérico / Indie',
  custom: 'Personalizado',
}

const CATEGORY_ORDER = ['fantasy', 'world-of-darkness', 'horror', 'scifi', 'generic', 'custom']

interface Props {
  open: boolean
  onClose: () => void
}

export function CreateCampaignModal({ open, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', description: '', systemName: '', theme: '',
    campaignType: 'campaign' as 'campaign' | 'oneshot',
    isOpen: false,
    maxSlots: '',
  })
  const [systems, setSystems] = useState<RPGSystem[]>([])

  useEffect(() => {
    if (!open) return
    fetch('/api/systems')
      .then(r => r.json())
      .then((data: RPGSystem[]) => Array.isArray(data) && setSystems(data))
      .catch(() => {})
  }, [open])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Nome é obrigatório'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          theme: form.theme,
          systemName: form.systemName,
          campaignType: form.campaignType,
          isOpen: form.isOpen,
          maxSlots: form.isOpen && form.maxSlots ? parseInt(form.maxSlots) : null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Erro ao criar campanha')
        return
      }
      const campaign = await res.json()
      onClose()
      setForm({ name: '', description: '', systemName: '', theme: '', campaignType: 'campaign', isOpen: false, maxSlots: '' })
      router.push(`/campaign/${campaign.id}`)
      router.refresh()
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  const grouped = CATEGORY_ORDER
    .map(cat => ({ cat, items: systems.filter(s => s.category === cat) }))
    .filter(g => g.items.length > 0)

  return (
    <Modal open={open} onClose={onClose} title="Nova Campanha">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Campaign type */}
        <div>
          <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-2">
            Tipo de Aventura
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['campaign', 'oneshot'] as const).map(type => {
              const sel = form.campaignType === type
              return (
                <button
                  key={type} type="button"
                  onClick={() => setForm(f => ({ ...f, campaignType: type }))}
                  className="flex flex-col items-start gap-1 px-3 py-3 rounded-lg border transition-all text-left"
                  style={{
                    background: sel ? 'rgba(201,162,42,0.10)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${sel ? 'rgba(201,162,42,0.45)' : 'rgba(255,255,255,0.1)'}`,
                  }}>
                  <span className={`text-[12px] font-semibold ${sel ? 'text-gold' : 'text-saga-muted'}`}>
                    {type === 'campaign' ? 'Campanha' : 'One-Shot'}
                  </span>
                  <span className="text-[10px] text-saga-dim leading-tight">
                    {type === 'campaign'
                      ? 'Múltiplas sessões, personagens evoluem'
                      : 'Sessão única e completa'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">
            Nome da Campanha *
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="A Maldição dos Dragões..."
            className="w-full bg-surface-2 border border-border rounded px-3 py-2.5 text-sm text-saga-text placeholder:text-saga-dim focus:outline-none focus:border-gold/60 transition-colors"
          />
        </div>

        <div>
          <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">
            Sistema
          </label>
          <select
            name="systemName"
            value={form.systemName}
            onChange={handleChange}
            className="w-full bg-surface-2 border border-border rounded px-3 py-2.5 text-sm text-saga-text focus:outline-none focus:border-gold/60 transition-colors"
          >
            <option value="">Nenhum / Livre</option>
            {grouped.map(({ cat, items }) => (
              <optgroup key={cat} label={CATEGORY_LABELS[cat] ?? cat}>
                {items.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">
            Tema / Ambientação
          </label>
          <input
            name="theme"
            value={form.theme}
            onChange={handleChange}
            placeholder="Medieval, sci-fi, horror..."
            className="w-full bg-surface-2 border border-border rounded px-3 py-2.5 text-sm text-saga-text placeholder:text-saga-dim focus:outline-none focus:border-gold/60 transition-colors"
          />
        </div>

        <div>
          <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">
            Descrição
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            placeholder="Uma breve descrição da campanha..."
            className="w-full bg-surface-2 border border-border rounded px-3 py-2.5 text-sm text-saga-text placeholder:text-saga-dim focus:outline-none focus:border-gold/60 transition-colors resize-none"
          />
        </div>

        {/* Open to applications */}
        <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-saga-text">Aberta para inscrições</p>
              <p className="text-[10px] text-saga-dim mt-0.5">Jogadores podem encontrar e se inscrever em &quot;Explorar Campanhas&quot;</p>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, isOpen: !f.isOpen }))}
              className={`relative w-9 h-5 rounded-full transition-all shrink-0 ${form.isOpen ? 'bg-gold' : 'bg-white/10'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${form.isOpen ? 'left-4' : 'left-0.5'}`} />
            </button>
          </div>
          {form.isOpen && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <label className="text-[10px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">
                Número de vagas (opcional)
              </label>
              <input
                name="maxSlots"
                type="number"
                min="1"
                max="20"
                value={form.maxSlots}
                onChange={handleChange}
                placeholder="Sem limite"
                className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-saga-text placeholder:text-saga-dim focus:outline-none focus:border-gold/60 transition-colors"
              />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-saga-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Criando...' : 'Criar Campanha'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
