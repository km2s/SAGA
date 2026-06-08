'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface ConfirmModalProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
}

const icons = {
  danger:  '⚠️',
  warning: '🕯️',
  default: '❓',
}

const confirmStyles = {
  danger:  'bg-saga-danger/10 text-saga-danger border border-saga-danger/40 hover:bg-saga-danger/20',
  warning: 'bg-gold-dim text-gold border border-gold/40 hover:bg-gold/20',
  default: 'bg-purple-dim text-purple-bright border border-purple/30 hover:bg-purple/20',
}

export function ConfirmModal({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
}: ConfirmModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const timeout = setTimeout(() => confirmRef.current?.focus(), 50)
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') onConfirm()
    }
    window.addEventListener('keydown', handleKey)
    return () => { clearTimeout(timeout); window.removeEventListener('keydown', handleKey) }
  }, [open, onCancel, onConfirm])

  if (!open || !isMounted) return null

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onCancel}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={e => e.stopPropagation()} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-sm mx-4 bg-surface border border-border-bright rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Top accent line */}
        <div className={`h-0.5 w-full ${variant === 'danger' ? 'bg-saga-danger' : variant === 'warning' ? 'bg-gold' : 'bg-purple'}`} />

        <div className="p-6">
          {/* Icon + title */}
          <div className="flex items-start gap-4 mb-4">
            <div className={`text-2xl shrink-0 mt-0.5`}>{icons[variant]}</div>
            <div>
              <h2 className="font-cinzel text-base font-semibold text-saga-text">{title}</h2>
              {description && (
                <p className="text-sm text-saga-muted mt-1 leading-relaxed">{description}</p>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border mb-5" />

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded text-sm font-medium bg-surface-3 text-saga-text border border-border hover:border-border-bright transition-all"
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmRef}
              onClick={onConfirm}
              className={`px-4 py-2 rounded text-sm font-medium transition-all ${confirmStyles[variant]}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
