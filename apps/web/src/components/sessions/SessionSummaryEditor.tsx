'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  campaignId: string
  sessionId: string
  initialContent: string | null
  isGM: boolean
}

export function SessionSummaryEditor({ campaignId, sessionId, initialContent, isGM }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(!initialContent && isGM)
  const [content, setContent] = useState(initialContent ?? '')
  const [draft, setDraft] = useState(initialContent ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!draft.trim()) { setError('Escreva algo antes de salvar'); return }
    setSaving(true)
    setError('')
    const res = await fetch(`/api/campaigns/${campaignId}/sessions/${sessionId}/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: draft.trim() }),
    }).catch(() => null)
    setSaving(false)
    if (!res?.ok) { setError('Erro ao salvar'); return }
    setContent(draft.trim())
    setEditing(false)
    router.refresh()
  }

  function cancel() {
    setDraft(content)
    setEditing(false)
    setError('')
  }

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="font-cinzel text-base font-semibold">Resumo da Sessão</h3>
        {isGM && !editing && (
          <button onClick={() => { setDraft(content); setEditing(true) }}
            className="text-[11px] text-saga-muted hover:text-gold transition-colors">
            {content ? 'Editar' : '+ Escrever resumo'}
          </button>
        )}
      </div>

      {editing ? (
        <div className="p-5 flex flex-col gap-3">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={10}
            autoFocus
            placeholder="Escreva aqui o que aconteceu nesta sessão. Use markdown se quiser: **negrito**, *itálico*, ## títulos..."
            className="w-full bg-surface-2 border border-border rounded px-4 py-3 text-sm text-saga-text placeholder:text-saga-dim focus:outline-none focus:border-gold/50 resize-y leading-relaxed"
          />
          {error && <p className="text-sm text-saga-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={cancel} className="px-3 py-1.5 rounded text-sm text-saga-muted hover:text-saga-text bg-surface-2 border border-border transition-colors">
              Cancelar
            </button>
            <button onClick={() => void save()} disabled={saving}
              className="px-4 py-1.5 rounded text-sm font-medium text-bg disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #c9a22a, #f0d060)' }}>
              {saving ? 'Salvando...' : '💾 Salvar Resumo'}
            </button>
          </div>
        </div>
      ) : content ? (
        <div className="px-5 py-5 prose prose-sm prose-invert max-w-none"
             style={{ lineHeight: '1.75' }}>
          {content.split('\n').map((line, i) => {
            if (line.startsWith('## ')) return <h3 key={i} className="font-cinzel text-base font-semibold text-saga-text mt-4 mb-2">{line.slice(3)}</h3>
            if (line.startsWith('# '))  return <h2 key={i} className="font-cinzel text-lg font-bold text-gold mt-5 mb-2">{line.slice(2)}</h2>
            if (line === '') return <div key={i} className="h-3" />
            return <p key={i} className="text-sm text-saga-muted leading-relaxed">{line}</p>
          })}
        </div>
      ) : (
        <div className="px-5 py-10 text-center text-sm text-saga-dim">
          {isGM ? 'Nenhum resumo escrito. Clique em "+ Escrever resumo" acima.' : 'O Mestre ainda não escreveu um resumo desta sessão.'}
        </div>
      )}
    </div>
  )
}
