'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface Props {
  open: boolean
  onClose: () => void
}

const SYSTEMS = ['D&D 5e', 'Tormenta20', 'Pathfinder 2e', 'Call of Cthulhu', 'Vampire: The Masquerade', 'Outro']

export function CreateCampaignModal({ open, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', description: '', systemName: '', theme: '' })

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
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Erro ao criar campanha')
        return
      }
      const campaign = await res.json()
      onClose()
      setForm({ name: '', description: '', systemName: '', theme: '' })
      router.push(`/campaign/${campaign.id}`)
      router.refresh()
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova Campanha">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            <option value="">Personalizado</option>
            {SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
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
