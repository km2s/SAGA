'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'

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
    <div className="bg-[#f5ecd6] border border-ink/20 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-ink/20 flex items-center justify-between">
        <h3 className="font-cinzel text-base font-semibold">Resumo da Sessão</h3>
        {isGM && !editing && (
          <button onClick={() => { setDraft(content); setEditing(true) }}
            className="text-[11px] text-ink-soft hover:text-gold transition-colors">
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
            className="w-full bg-parchment/60 border border-ink/20 rounded px-4 py-3 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:border-gold/50 resize-y leading-relaxed"
          />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={cancel} className="px-3 py-1.5 rounded text-sm text-ink-soft hover:text-ink bg-parchment/60 border border-ink/20 transition-colors">
              Cancelar
            </button>
            <button onClick={() => void save()} disabled={saving}
              className="px-4 py-1.5 rounded text-sm font-medium text-crypt-deep disabled:opacity-50 bg-gradient-gold">
              {saving ? 'Salvando...' : <span className="flex items-center gap-1.5"><Save size={13} />Salvar Resumo</span>}
            </button>
          </div>
        </div>
      ) : content ? (
        <div className="px-5 py-5 prose prose-sm prose-invert max-w-none"
             style={{ lineHeight: '1.75' }}>
          {content.split('\n').map((line, i) => {
            if (line.startsWith('## ')) return <h3 key={i} className="font-cinzel text-base font-semibold text-ink mt-4 mb-2">{line.slice(3)}</h3>
            if (line.startsWith('# '))  return <h2 key={i} className="font-cinzel text-lg font-bold text-gold mt-5 mb-2">{line.slice(2)}</h2>
            if (line === '') return <div key={i} className="h-3" />
            return <p key={i} className="text-sm text-ink-soft leading-relaxed">{line}</p>
          })}
        </div>
      ) : (
        <div className="px-5 py-10 text-center text-sm text-ink-soft">
          {isGM ? 'Nenhum resumo escrito. Clique em "+ Escrever resumo" acima.' : 'O Mestre ainda não escreveu um resumo desta sessão.'}
        </div>
      )}
    </div>
  )
}
