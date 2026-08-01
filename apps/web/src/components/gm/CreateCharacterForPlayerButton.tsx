'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { UserPlus } from 'lucide-react'

/**
 * Mestre cria a ficha em nome de um jogador que ainda não tem personagem.
 * A ficha nasce ligada ao jogador — ele edita normalmente — e o mestre também
 * pode editar, porque a permissão da ficha é `dono || GM da campanha`.
 */
export function CreateCharacterForPlayerButton({ campaignId, memberId, playerName, systemId, systemName }: {
  campaignId: string
  memberId: string
  playerName: string
  systemId: string | null
  systemName: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', race: '', class: '', level: '1', maxHp: '10' })

  function set(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function close() {
    setError('')
    setForm({ name: '', race: '', class: '', level: '1', maxHp: '10' })
    setOpen(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Nome obrigatório'); return }
    setError('')
    setLoading(true)
    const maxHp = parseInt(form.maxHp) || 10
    const res = await fetch('/api/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId,
        memberId,
        name: form.name.trim(),
        race: form.race.trim() || null,
        class: form.class.trim() || null,
        level: parseInt(form.level) || 1,
        hp: maxHp,
        maxHp,
        systemId,
      }),
    }).catch(() => null)
    setLoading(false)
    if (!res?.ok) {
      const data = await res?.json().catch(() => ({})) as { error?: string }
      setError(data.error ?? 'Erro ao criar ficha')
      return
    }
    close()
    router.refresh()
  }

  const field = 'w-full bg-parchment/60 border border-ink/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-wax transition-colors'
  const label = 'text-[11px] text-ink-soft font-bold uppercase tracking-widest block mb-1.5'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded border border-ink/20 text-ink-soft hover:border-wax hover:text-wax transition-all shrink-0"
      >
        <UserPlus size={11} /> Criar ficha
      </button>

      <Modal open={open} onClose={close} title={`Criar ficha para ${playerName}`}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <p className="text-[11px] text-ink-soft leading-relaxed">
            A ficha fica no nome de <span className="text-ink font-medium">{playerName}</span>, que poderá
            editá-la normalmente. Você, como Mestre, também continua podendo editar.
            {systemName && <> Os atributos de <span className="text-ink">{systemName}</span> são adicionados automaticamente.</>}
          </p>

          <div>
            <label className={label}>Nome do personagem *</label>
            <input autoFocus value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Lyra Sombramoon…" className={field} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Raça / Clã</label>
              <input value={form.race} onChange={e => set('race', e.target.value)}
                placeholder="Gangrel, Fianna…" className={field} />
            </div>
            <div>
              <label className={label}>Classe / Conceito</label>
              <input value={form.class} onChange={e => set('class', e.target.value)}
                placeholder="Toreador, Ahroun…" className={field} />
            </div>
            <div>
              <label className={label}>Nível / Geração</label>
              <input type="number" min="1" value={form.level} onChange={e => set('level', e.target.value)} className={field} />
            </div>
            <div>
              <label className={label}>HP / Vitalidade</label>
              <input type="number" min="1" value={form.maxHp} onChange={e => set('maxHp', e.target.value)} className={field} />
            </div>
          </div>

          {error && <p className="text-sm text-wax">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" type="button" onClick={close}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Criando…' : 'Criar ficha'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
