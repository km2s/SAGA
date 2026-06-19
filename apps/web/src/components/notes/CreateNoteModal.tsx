'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/lib/i18n/context'

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
  const { t } = useLocale()

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
        setError(data.error ?? t.errors.saveNote)
        return
      }
      onClose()
      setForm({ title: '', content: '', visibility: 'PRIVATE' })
      router.refresh()
    } catch {
      setError(t.errors.connection)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t.createNote.title}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">
            {t.createNote.titleLabel} <span className="font-normal normal-case tracking-normal text-saga-dim">({t.common.optional})</span>
          </label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder={t.createNote.titlePlaceholder}
            className="w-full bg-surface-2 border border-border rounded px-3 py-2.5 text-sm text-saga-text placeholder:text-saga-dim focus:outline-none focus:border-gold/60 transition-colors"
          />
        </div>

        <div>
          <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">
            {t.createNote.contentLabel} *
          </label>
          <textarea
            name="content"
            value={form.content}
            onChange={handleChange}
            rows={5}
            placeholder={t.createNote.contentPlaceholder}
            className="w-full bg-surface-2 border border-border rounded px-3 py-2.5 text-sm text-saga-text placeholder:text-saga-dim focus:outline-none focus:border-gold/60 transition-colors resize-none"
          />
        </div>

        <div>
          <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">
            {t.createNote.visibilityLabel}
          </label>
          <select
            name="visibility"
            value={form.visibility}
            onChange={handleChange}
            className="w-full bg-surface-2 border border-border rounded px-3 py-2.5 text-sm text-saga-text focus:outline-none focus:border-gold/60 transition-colors"
          >
            <option value="PRIVATE">{t.createNote.visPrivate}</option>
            <option value="CAMPAIGN">{t.createNote.visCampaign}</option>
            {isGM && <option value="GM_ONLY">{t.createNote.visGmOnly}</option>}
          </select>
        </div>

        {error && <p className="text-sm text-saga-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" type="button" onClick={onClose}>{t.common.cancel}</Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? t.createNote.saving : t.createNote.saveBtn}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
