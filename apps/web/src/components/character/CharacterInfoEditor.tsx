'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

type Field = 'name' | 'race' | 'class'

const INPUT = 'bg-parchment/60 border border-gold/40 rounded px-2 py-1 focus:outline-none text-sm'

/**
 * Nome, raça e classe da ficha do personagem, editáveis depois de criada
 * (dono da ficha ou Mestre da campanha). Clique no texto para editar; Enter
 * salva, Esc cancela. Sem permissão, mostra só leitura como antes.
 */
export function CharacterInfoEditor({ characterId, name, race, charClass, level, canEdit }: {
  characterId: string
  name: string
  race: string | null
  charClass: string | null
  level: number
  canEdit: boolean
}) {
  const router = useRouter()
  const [values, setValues] = useState<Record<Field, string | null>>({ name, race, class: charClass })
  const [editing, setEditing] = useState<Field | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function start(field: Field) {
    if (!canEdit) return
    setError('')
    setDraft(values[field] ?? '')
    setEditing(field)
  }

  async function commit(field: Field) {
    setEditing(null)
    const trimmed = draft.trim()
    if (trimmed === (values[field] ?? '')) return
    if (field === 'name' && !trimmed) { setError('O nome não pode ficar vazio.'); return }

    const previous = values[field]
    setValues(v => ({ ...v, [field]: trimmed || null }))
    setSaving(true)
    const res = await fetch(`/api/characters/${characterId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: trimmed || null }),
    }).catch(() => null)
    setSaving(false)
    if (!res?.ok) {
      setValues(v => ({ ...v, [field]: previous }))
      const data = await res?.json().catch(() => ({})) as { error?: string }
      setError(data.error ?? 'Não foi possível salvar.')
      return
    }
    router.refresh()
  }

  function onKey(e: React.KeyboardEvent, field: Field) {
    if (e.key === 'Enter') { e.preventDefault(); void commit(field) }
    if (e.key === 'Escape') setEditing(null)
  }

  function row(field: 'race' | 'class', label: string) {
    const value = values[field]
    if (!canEdit && !value) return null
    return (
      <div className="flex justify-between items-center gap-2 text-[12px] mt-2">
        <span className="text-ink-soft shrink-0">{label}</span>
        {editing === field ? (
          <input
            autoFocus value={draft} maxLength={60}
            onChange={e => setDraft(e.target.value)}
            onBlur={() => void commit(field)}
            onKeyDown={e => onKey(e, field)}
            aria-label={label}
            className={`text-right w-32 ${INPUT}`}
          />
        ) : (
          <span
            onClick={() => start(field)}
            title={canEdit ? 'Clique para editar' : undefined}
            className={`font-fell text-right truncate ${canEdit ? 'cursor-pointer hover:text-gold transition-colors' : ''}`}
          >
            {value ?? <span className="text-ink-soft italic">—</span>}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="p-4">
      {editing === 'name' ? (
        <input
          autoFocus value={draft} maxLength={100}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => void commit('name')}
          onKeyDown={e => onKey(e, 'name')}
          aria-label="Nome do personagem"
          className={`w-full font-cinzel-deco text-sm font-bold text-center ${INPUT}`}
        />
      ) : (
        <h2
          onClick={() => start('name')}
          title={canEdit ? 'Clique para editar o nome' : undefined}
          className={`group font-cinzel-deco text-base font-bold text-center leading-snug ${canEdit ? 'cursor-pointer hover:text-gold transition-colors' : ''}`}
        >
          {values.name}
          {canEdit && (
            <Pencil size={11} className="inline-block ml-1.5 -mt-0.5 opacity-0 group-hover:opacity-50 transition-opacity" />
          )}
        </h2>
      )}

      {row('race', 'Raça')}
      {row('class', 'Classe')}

      <div className="flex justify-center mt-3">
        <Badge variant="gold">Nível {level}</Badge>
      </div>

      {(saving || error) && (
        <p className={`text-[10px] text-center mt-2 ${error ? 'text-wax' : 'text-ink-soft'}`}>
          {error || 'Salvando...'}
        </p>
      )}
    </div>
  )
}
