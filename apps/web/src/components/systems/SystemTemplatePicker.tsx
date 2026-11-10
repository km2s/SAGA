'use client'

import { useState, useEffect } from 'react'
import { Check, Loader2, Search, Lock } from 'lucide-react'

interface SystemOption {
  id: string
  name: string
  category: string
  isPreset: boolean
}

const CATEGORY_LABEL: Record<string, string> = {
  fantasy: 'Fantasia', 'world-of-darkness': 'Mundo das Trevas', horror: 'Horror',
  scifi: 'Sci-Fi', generic: 'Genérico', custom: 'Personalizado',
}

/**
 * Lista de sistemas com seleção múltipla, usada para escolher modelos de ficha:
 * clonar atributos ao criar/importar num sistema custom e escolher o template
 * de um NPC. Marcar mais de um sistema mistura os modelos (dedupe por nome no
 * servidor — a ordem de seleção define quem "vence" nos repetidos).
 */
export function SystemTemplatePicker({ selected, onChange, excludeId }: {
  selected: string[]
  onChange: (ids: string[]) => void
  excludeId?: string
}) {
  const [systems, setSystems] = useState<SystemOption[] | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/systems')
      .then(r => r.ok ? r.json() : [])
      .then((data: SystemOption[]) => { if (!cancelled) setSystems(Array.isArray(data) ? data : []) })
      .catch(() => { if (!cancelled) setSystems([]) })
    return () => { cancelled = true }
  }, [])

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])
  }

  if (systems === null) {
    return (
      <div className="flex items-center gap-2 text-ink-soft text-xs py-3">
        <Loader2 size={13} className="animate-spin" /> Carregando sistemas...
      </div>
    )
  }

  const visible = systems
    .filter(s => s.id !== excludeId)
    .filter(s => !search.trim() || s.name.toLowerCase().includes(search.trim().toLowerCase()))

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft/60" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar sistema..."
          className="w-full pl-7 pr-3 py-1.5 rounded-lg text-xs bg-parchment/60 border border-ink/20 text-ink placeholder:text-ink-soft/60 focus:outline-none focus:border-wax transition-colors"
        />
      </div>
      {/* Sem divisórias entre os itens: no pergaminho elas apareciam como
          linhas claras dentro do campo. A separação fica por hover/seleção. */}
      <div className="max-h-44 overflow-y-auto rounded-lg border border-ink/15 p-1 space-y-0.5">
        {visible.length === 0 && (
          <p className="text-[11px] text-ink-soft italic px-3 py-3">Nenhum sistema encontrado.</p>
        )}
        {visible.map(s => {
          const isSel = selected.includes(s.id)
          const order = isSel ? selected.indexOf(s.id) + 1 : null
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${
                isSel ? 'bg-gold/15' : 'hover:bg-ink/5'
              }`}
            >
              <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 text-[8px] font-bold ${
                isSel ? 'bg-wax border-wax-deep text-parchment' : 'border-ink/30 text-transparent'
              }`}>
                {selected.length > 1 && order !== null ? order : <Check size={10} />}
              </span>
              <span className="flex-1 min-w-0 text-xs text-ink truncate">{s.name}</span>
              {s.isPreset && <Lock size={9} className="text-ink-soft/50 shrink-0" />}
              <span className="text-[9px] text-ink-soft shrink-0">{CATEGORY_LABEL[s.category] ?? s.category}</span>
            </button>
          )
        })}
      </div>
      {selected.length > 1 && (
        <p className="text-[10px] text-ink-soft">
          {selected.length} sistemas selecionados — os modelos serão mesclados (atributos repetidos entram uma vez, na ordem da seleção).
        </p>
      )}
    </div>
  )
}
