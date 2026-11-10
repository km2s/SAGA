'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AddAttributeModal } from './AddAttributeModal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Dumbbell, Zap, Heart, BookOpen, Leaf, Sparkles, Swords, X } from 'lucide-react'

interface Attribute {
  id: string
  value: number
  customDie: string | null
  attribute: { name: string; defaultDie: string }
}

const ATTRIBUTE_ICONS: Record<string, React.ElementType> = {
  Força: Dumbbell, Destreza: Zap, Constituição: Heart,
  Inteligência: BookOpen, Sabedoria: Leaf, Carisma: Sparkles,
}

function getModifier(value: number): string {
  const mod = Math.floor((value - 10) / 2)
  return mod >= 0 ? `+${mod}` : `${mod}`
}

export function AttributePanel({ characterId, attributes, canEdit }: {
  characterId: string
  attributes: Attribute[]
  canEdit: boolean
}) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(attrId: string) {
    setDeleteTarget(null)
    setDeleting(attrId)
    await fetch(`/api/characters/${characterId}/attributes`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ charAttributeId: attrId }),
    }).catch(() => null)
    setDeleting(null)
    router.refresh()
  }

  const targetAttr = attributes.find(a => a.id === deleteTarget)

  return (
    <div className="bg-card border border-ink/20 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-ink/20 flex items-center justify-between">
        <h3 className="font-cinzel text-base font-semibold">Atributos</h3>
        {canEdit && (
          <button
            onClick={() => setAddOpen(true)}
            className="px-3 py-1 rounded text-xs font-medium bg-gold/15 border border-gold/30 text-gold hover:bg-gold/20 transition-colors"
          >
            + Adicionar
          </button>
        )}
      </div>

      {attributes.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-ink-soft">
          {canEdit
            ? 'Nenhum atributo. Clique em "+ Adicionar" para registrar seus atributos.'
            : 'Nenhum atributo registrado.'}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {attributes.map(attr => {
            const AttrIcon = ATTRIBUTE_ICONS[attr.attribute.name] ?? Swords
            const mod = getModifier(attr.value)
            const isPositive = !mod.startsWith('-')

            return (
              <div key={attr.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-parchment/60 transition-all group">
                <div className="w-10 h-10 rounded-lg bg-ink/[0.06] border border-ink/20 flex items-center justify-center text-ink-soft shrink-0">
                  <AttrIcon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{attr.attribute.name}</p>
                  <p className="text-[11px] text-ink-soft">
                    {attr.customDie ?? attr.attribute.defaultDie} · valor {attr.value}
                  </p>
                </div>
                <p className={`font-cinzel text-2xl font-bold mr-3 ${isPositive ? 'text-gold' : 'text-red-700'}`}>
                  {mod}
                </p>
                {canEdit && (
                  <button
                    onClick={() => setDeleteTarget(attr.id)}
                    disabled={deleting === attr.id}
                    className="opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-1 rounded text-red-700 border border-saga-danger/30 hover:bg-saga-danger/10 disabled:opacity-50"
                  >
                    {deleting === attr.id ? '...' : <X size={10} />}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {canEdit && (
        <>
          <AddAttributeModal
            characterId={characterId}
            open={addOpen}
            onClose={() => setAddOpen(false)}
          />
          <ConfirmModal
            open={!!deleteTarget}
            variant="warning"
            title={`Remover ${targetAttr?.attribute.name ?? 'atributo'}?`}
            description="O atributo será removido da ficha permanentemente."
            confirmLabel="Remover"
            cancelLabel="Cancelar"
            onConfirm={() => deleteTarget && void handleDelete(deleteTarget)}
            onCancel={() => setDeleteTarget(null)}
          />
        </>
      )}
    </div>
  )
}
