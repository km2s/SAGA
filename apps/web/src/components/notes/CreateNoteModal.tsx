'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'

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
          <label className="text-[11px] text-ink-soft font-bold uppercase tracking-widest block mb-1.5">
            Título (opcional)
          </label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Nome da nota..."
            className="w-full bg-parchment/60 border border-ink/20 rounded px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:border-wax transition-colors"
          />
        </div>

        <div>
          <label className="text-[11px] text-ink-soft font-bold uppercase tracking-widest block mb-1.5">
            Conteúdo *
          </label>
          <textarea
            name="content"
            value={form.content}
            onChange={handleChange}
            rows={5}
            placeholder="Escreva sua nota aqui..."
            className="w-full bg-parchment/60 border border-ink/20 rounded px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:border-wax transition-colors resize-none"
          />
        </div>

        <div>
          <label className="text-[11px] text-ink-soft font-bold uppercase tracking-widest block mb-1.5">
            Visibilidade
          </label>
          <Select
            value={form.visibility}
            onChange={v => setForm(f => ({ ...f, visibility: v }))}
            options={[
              { value: 'PRIVATE', label: 'Privada — só você' },
              { value: 'CAMPAIGN', label: 'Campanha — todos os jogadores' },
              ...(isGM ? [{ value: 'GM_ONLY', label: 'Só Mestre' }] : []),
            ]}
          />
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}

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
