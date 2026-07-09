'use client'

import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="parchment-card relative rounded-lg w-[500px] max-w-[92vw] max-h-[90vh] flex flex-col text-ink">
        <div className="flex items-center justify-between px-6 pt-6 pb-5 shrink-0">
          <h2 className="font-cinzel text-lg font-semibold text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="text-ink-soft hover:text-wax transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 pb-6 flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
