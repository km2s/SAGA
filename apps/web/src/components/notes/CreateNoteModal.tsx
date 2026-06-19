'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface Props {
  open: boolean
  onClose: () => void
  campaignId: string
  isGM: boolean
}

export function CreateNoteModal({ open, onClose, campaignId, isGM }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title: '', content: '', visibility: 'PRIVATE' })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.content.trim()) { setError('Conteúdo é obrigatório'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Erro ao salvar nota')
        return
      }
      onClose()
      setForm({ title: '', content: '', visibility: 'PRIVATE' })
      router.refresh()
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova Nota">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">
            Título (opcional)
          </label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Nome da nota..."
            className="w-full bg-surface-2 border border-border rounded px-3 py-2.5 text-sm text-saga-text placeholder:text-saga-dim focus:outline-none focus:border-gold/60 transition-colors"
          />
        </div>

        <div>
          <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">
            Conteúdo *
          </label>
          <textarea
            name="content"
            value={form.content}
            onChange={handleChange}
            rows={5}
            placeholder="Escreva sua nota aqui..."
            className="w-full bg-surface-2 border border-border rounded px-3 py-2.5 text-sm text-saga-text placeholder:text-saga-dim focus:outline-none focus:border-gold/60 transition-colors resize-none"
          />
        </div>

        <div>
          <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">
            Visibilidade
          </label>
          <select
            name="visibility"
            value={form.visibility}
            onChange={handleChange}
            className="w-full bg-surface-2 border border-border rounded px-3 py-2.5 text-sm text-saga-text focus:outline-none focus:border-gold/60 transition-colors"
          >
            <option value="PRIVATE">Privada — só você</option>
            <option value="CAMPAIGN">Campanha — todos os jogadores</option>
            {isGM && <option value="GM_ONLY">Só Mestre</option>}
          </select>
        </div>

        {error && <p className="text-sm text-saga-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Nota'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
