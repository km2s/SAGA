'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, X, Check, User, Swords, Sparkles, Shield, Sword, Plus, Axe, Leaf, Music, Target, Dumbbell, Wand2, Moon, ScrollText } from 'lucide-react'
import { safeImageUrl } from '@/lib/safe-url'

const CLASS_ICONS: Record<string, React.ElementType> = {
  Guerreiro: Swords, Mago: Sparkles, Paladino: Shield, Ladino: Sword, Clérigo: Plus,
  Bárbaro: Axe, Druida: Leaf, Bardo: Music, Ranger: Target, Monge: Dumbbell,
  Feiticeiro: Wand2, Bruxo: Moon, Arcanista: ScrollText,
}

interface Props {
  characterId: string
  imageUrl: string | null
  name: string
  charClass: string | null
  canEdit: boolean
}

export function CharacterPortrait({ characterId, imageUrl, name, charClass, canEdit }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(imageUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const ClassIcon = CLASS_ICONS[charClass ?? ''] ?? User
  const safe = safeImageUrl(imageUrl)

  async function save() {
    setSaving(true)
    setError('')
    const res = await fetch(`/api/characters/${characterId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: value.trim() || null }),
    }).catch(() => null)
    setSaving(false)
    if (!res?.ok) { setError('Erro ao salvar'); return }
    setEditing(false)
    router.refresh()
  }

  return (
    <div className="relative">
      {safe ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={safe} alt={name} className="w-full h-52 object-cover object-top" />
      ) : (
        <div className="w-full h-52 bg-gradient-to-br from-[#1a0533] via-[#4a1080] to-[#7c3aed] flex items-center justify-center">
          <ClassIcon size={72} className="text-white/50" />
        </div>
      )}

      {canEdit && !editing && (
        <button
          onClick={() => { setValue(imageUrl ?? ''); setEditing(true) }}
          title="Trocar imagem"
          className="absolute bottom-2 right-2 p-1.5 rounded-full transition-all"
          style={{ background: 'rgba(0,0,0,0.65)', color: 'rgba(255,255,255,0.75)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'white' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)' }}
        >
          <Camera size={14} />
        </button>
      )}

      {canEdit && editing && (
        <div className="absolute bottom-0 left-0 right-0 p-2 flex flex-col gap-1.5"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}>
          <div className="flex gap-1.5">
            <input
              autoFocus
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
              placeholder="https://exemplo.com/imagem.jpg"
              className="flex-1 px-2 py-1.5 rounded text-xs text-white placeholder:text-white/30 focus:outline-none min-w-0"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
            />
            <button
              onClick={save}
              disabled={saving}
              title="Confirmar"
              className="p-1.5 rounded text-white transition-all disabled:opacity-50"
              style={{ background: '#16a34a' }}>
              <Check size={12} />
            </button>
            <button
              onClick={() => setEditing(false)}
              title="Cancelar"
              className="p-1.5 rounded text-white transition-all"
              style={{ background: 'rgba(255,255,255,0.15)' }}>
              <X size={12} />
            </button>
          </div>
          {error && <p className="text-[10px] text-red-400">{error}</p>}
        </div>
      )}
    </div>
  )
}
