'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'

interface Option { value: string; label: string }

interface Rect { top: number; left: number; width: number; maxHeight: number }

/**
 * Dropdown no tema pergaminho — substitui o <select> nativo (que o OS renderiza
 * fora do tema). O popover é renderizado via portal com position: fixed, então
 * não é cortado por containers com overflow-hidden e "vira pra cima" quando não
 * há espaço embaixo.
 */
export function Select({ value, onChange, options, placeholder = 'Selecione…', className = '', size = 'md', disabled = false }: {
  value: string
  onChange: (v: string) => void
  options: Option[]
  placeholder?: string
  className?: string
  size?: 'sm' | 'md'
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<Rect | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value)

  const pad = size === 'sm' ? 'px-2 py-1 text-[11px]' : 'px-2 py-1.5 text-sm'

  function place() {
    const b = btnRef.current?.getBoundingClientRect()
    if (!b) return
    const estH = Math.min(240, options.length * 32 + 8)
    const spaceBelow = window.innerHeight - b.bottom
    if (spaceBelow < estH + 8 && b.top > spaceBelow) {
      setRect({ top: Math.max(8, b.top - estH - 4), left: b.left, width: b.width, maxHeight: Math.min(estH, b.top - 12) })
    } else {
      setRect({ top: b.bottom + 4, left: b.left, width: b.width, maxHeight: Math.min(240, spaceBelow - 12) })
    }
  }

  useEffect(() => { if (open) place() }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (btnRef.current?.contains(t) || popRef.current?.contains(t)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    function reposition() { place() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={e => { e.preventDefault(); e.stopPropagation(); if (!disabled) setOpen(o => !o) }}
        className={`w-full flex items-center justify-between gap-2 bg-parchment/60 border border-ink/20 rounded ${pad} text-ink hover:border-wax/60 focus:outline-none focus:border-wax transition-colors disabled:opacity-60`}
      >
        <span className={`truncate ${selected ? 'text-ink' : 'text-ink-soft'}`}>{selected?.label ?? placeholder}</span>
        <ChevronDown size={14} className={`text-ink-soft shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && rect && typeof document !== 'undefined' && createPortal(
        <div
          ref={popRef}
          style={{ position: 'fixed', top: rect.top, left: rect.left, width: rect.width, maxHeight: rect.maxHeight, zIndex: 1000 }}
          className="overflow-y-auto rounded-lg border border-ink/25 bg-parchment py-1 shadow-xl shadow-ink/30"
        >
          {options.map(o => {
            const active = o.value === value
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false) }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-sm transition-colors ${active ? 'bg-wax/15 text-wax font-medium' : 'text-ink hover:bg-wax/10'}`}
              >
                <span className="truncate">{o.label}</span>
                {active && <Check size={13} className="shrink-0" />}
              </button>
            )
          })}
        </div>,
        document.body,
      )}
    </div>
  )
}
