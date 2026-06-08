'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AddAttributeModal } from './AddAttributeModal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

interface Attribute {
  id: string
  value: number
  customDie: string | null
  attribute: { name: string; defaultDie: string; description?: string | null }
}

function getModifier(value: number) {
  const mod = Math.floor((value - 10) / 2)
  return mod >= 0 ? `+${mod}` : `${mod}`
}

const ATTR_ABBREV: Record<string, string> = {
  'Força': 'FOR', 'Destreza': 'DES', 'Constituição': 'CON',
  'Inteligência': 'INT', 'Sabedoria': 'SAB', 'Carisma': 'CAR',
  'Pontos de Mana': 'PM',
  'Tamanho': 'TAM', 'Aparência': 'APR', 'Poder': 'POD', 'Educação': 'EDU', 'Sanidade': 'SAN',
}

const CORE_ATTRS = ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma']

function EditableValue({ attrId, value, characterId, onSaved }: {
  attrId: string; value: number; characterId: string; onSaved: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(value))
  const [saving, setSaving] = useState(false)

  async function save() {
    const n = parseInt(val)
    if (isNaN(n) || n === value) { setEditing(false); return }
    setSaving(true)
    await fetch(`/api/characters/${characterId}/attributes/${attrId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: n }),
    }).catch(() => null)
    setSaving(false)
    setEditing(false)
    onSaved()
  }

  if (editing) {
    return (
      <input autoFocus type="number" value={val} onChange={e => setVal(e.target.value)}
        onBlur={save} onKeyDown={e => { if (e.key === 'Enter') void save(); if (e.key === 'Escape') setEditing(false) }}
        className="w-12 text-center bg-surface-2 border border-gold/40 rounded text-lg font-bold focus:outline-none text-saga-text"
        style={{ MozAppearance: 'textfield' }}
      />
    )
  }
  return (
    <span className="text-xs text-saga-muted cursor-pointer hover:text-gold transition-colors" onClick={() => { setEditing(true); setVal(String(value)) }}>
      {saving ? '...' : value}
    </span>
  )
}

export function PresetAttributeGrid({ characterId, attributes, canEdit }: {
  characterId: string
  attributes: Attribute[]
  canEdit: boolean
}) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // Separate core D&D-style attributes from extras
  const core = attributes.filter(a => CORE_ATTRS.includes(a.attribute.name))
  const extras = attributes.filter(a => !CORE_ATTRS.includes(a.attribute.name))

  async function handleDelete(id: string) {
    setDeleteTarget(null)
    await fetch(`/api/characters/${characterId}/attributes`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ charAttributeId: id }),
    }).catch(() => null)
    router.refresh()
  }

  const targetAttr = attributes.find(a => a.id === deleteTarget)

  return (
    <div className="space-y-4">
      {/* Core 6-attribute hexagonal grid */}
      {core.length > 0 && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-cinzel text-sm font-semibold">Atributos Principais</h3>
            {canEdit && (
              <button onClick={() => setAddOpen(true)} className="text-[10px] text-saga-muted hover:text-gold transition-colors">
                + Adicionar
              </button>
            )}
          </div>
          <div className="p-4 grid grid-cols-3 md:grid-cols-6 gap-2">
            {core.map(attr => {
              const mod = getModifier(attr.value)
              const isPos = !mod.startsWith('-')
              const abbrev = ATTR_ABBREV[attr.attribute.name] ?? attr.attribute.name.slice(0, 3).toUpperCase()
              return (
                <div key={attr.id}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg border border-border bg-surface-2 hover:border-border-bright transition-all group">
                  {/* Modifier — large */}
                  <p className={`font-cinzel text-2xl font-bold leading-none ${isPos ? 'text-gold' : 'text-saga-danger'}`}>
                    {mod}
                  </p>
                  {/* Divider */}
                  <div className="w-full h-px bg-border" />
                  {/* Value — editable */}
                  <div className="flex flex-col items-center">
                    {canEdit ? (
                      <EditableValue attrId={attr.id} value={attr.value} characterId={characterId} onSaved={() => router.refresh()} />
                    ) : (
                      <span className="text-xs text-saga-muted">{attr.value}</span>
                    )}
                  </div>
                  {/* Abbreviation */}
                  <p className="text-[9px] font-bold text-saga-dim uppercase tracking-widest">{abbrev}</p>
                  {/* Full name tooltip on hover */}
                  {canEdit && (
                    <button onClick={() => setDeleteTarget(attr.id)}
                      className="hidden group-hover:block text-[9px] text-saga-danger/60 hover:text-saga-danger transition-colors mt-0.5">
                      remover
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Extra attributes (non-core) */}
      {(extras.length > 0 || (core.length === 0)) && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-cinzel text-sm font-semibold">
              {core.length > 0 ? 'Atributos Extras' : 'Atributos'}
            </h3>
            {canEdit && (
              <button onClick={() => setAddOpen(true)}
                className="px-2.5 py-1 rounded text-[10px] font-medium bg-gold-dim border border-gold/30 text-gold hover:bg-gold/20 transition-colors">
                + Adicionar
              </button>
            )}
          </div>
          {extras.length === 0 && core.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-saga-muted">
              {canEdit ? 'Nenhum atributo. Clique em "+ Adicionar".' : 'Nenhum atributo.'}
            </div>
          ) : extras.length === 0 ? null : (
            <div className="divide-y divide-border">
              {extras.map(attr => {
                const mod = getModifier(attr.value)
                const isPos = !mod.startsWith('-')
                return (
                  <div key={attr.id} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-2 transition-all group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{attr.attribute.name}</p>
                      {attr.attribute.description && (
                        <p className="text-[10px] text-saga-dim truncate">{attr.attribute.description}</p>
                      )}
                    </div>
                    {canEdit ? (
                      <EditableValue attrId={attr.id} value={attr.value} characterId={characterId} onSaved={() => router.refresh()} />
                    ) : (
                      <span className="text-xs text-saga-muted">{attr.value}</span>
                    )}
                    <p className={`font-cinzel text-xl font-bold w-10 text-right ${isPos ? 'text-gold' : 'text-saga-danger'}`}>
                      {mod}
                    </p>
                    {canEdit && (
                      <button onClick={() => setDeleteTarget(attr.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded text-[10px] text-saga-danger border border-saga-danger/30 hover:bg-saga-danger/10">
                        ✕
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {canEdit && (
        <>
          <AddAttributeModal characterId={characterId} open={addOpen} onClose={() => setAddOpen(false)} />
          <ConfirmModal open={!!deleteTarget} variant="warning"
            title={`Remover ${targetAttr?.attribute.name ?? 'atributo'}?`}
            description="O atributo será removido da ficha permanentemente."
            confirmLabel="Remover" cancelLabel="Cancelar"
            onConfirm={() => deleteTarget && void handleDelete(deleteTarget)}
            onCancel={() => setDeleteTarget(null)} />
        </>
      )}
    </div>
  )
}
