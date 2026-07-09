'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

export interface TutorialStep {
  title: string
  description: string
  icon: React.ElementType
  iconBg?: string
  iconColor?: string
  actionLabel?: string
  onAction?: () => void
  skipActionLabel?: string
  onSkipAction?: () => void
}

interface TutorialModalProps {
  open: boolean
  steps: TutorialStep[]
  currentStep: number
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
  onClose: () => void
}

export function TutorialModal({
  open, steps, currentStep, onNext, onPrev, onSkip, onClose,
}: TutorialModalProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const step = steps[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === steps.length - 1

  useEffect(() => {
    if (!open) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onSkip()
      if (e.key === 'ArrowRight' && !isLast) onNext()
      if (e.key === 'ArrowLeft' && !isFirst) onPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, isFirst, isLast, onNext, onPrev, onSkip])

  if (!mounted || !open || !step) return null

  const Icon = step.icon

  const modal = (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-md" onClick={onSkip} />

      <div className="relative w-full max-w-md bg-[#f5ecd6] border border-ink/20 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Top gradient bar */}
        <div className="h-0.5 bg-gradient-to-r from-purple via-gold to-purple" />

        {/* Close */}
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 text-ink-soft hover:text-ink transition-colors z-10"
        >
          <X size={16} />
        </button>

        {/* Progress dots */}
        <div className="flex justify-center items-center gap-1.5 pt-6 pb-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === currentStep
                  ? 'w-6 h-2 bg-gold'
                  : i < currentStep
                  ? 'w-2 h-2 bg-gold/40'
                  : 'w-2 h-2 bg-border-bright'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-8 pb-6 pt-4 text-center">
          {/* Icon */}
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 ${step.iconBg ?? 'bg-gold/15'}`}>
            <Icon size={30} className={step.iconColor ?? 'text-gold'} />
          </div>

          {/* Title */}
          <h2 className="font-cinzel text-xl font-bold text-ink mb-3 leading-snug">
            {step.title}
          </h2>

          {/* Description */}
          <p className="text-sm text-ink-soft leading-relaxed">
            {step.description}
          </p>

          {/* Primary action button */}
          {step.actionLabel && step.onAction && (
            <button
              onClick={step.onAction}
              className="mt-5 w-full bg-gold text-ink font-semibold py-2.5 rounded-lg hover:bg-gold-dark transition-colors text-sm"
            >
              {step.actionLabel}
            </button>
          )}

          {/* Skip-action text (e.g. "Pular por enquanto") */}
          {step.skipActionLabel && step.onSkipAction && (
            <button
              onClick={step.onSkipAction}
              className="mt-2.5 text-sm text-ink-soft hover:text-ink-soft transition-colors"
            >
              {step.skipActionLabel}
            </button>
          )}
        </div>

        {/* Navigation footer */}
        <div className="border-t border-ink/20 px-6 py-3.5 flex items-center justify-between">
          <button
            onClick={onPrev}
            disabled={isFirst}
            className="flex items-center gap-1 text-sm text-ink-soft hover:text-ink disabled:opacity-0 transition-colors"
          >
            <ChevronLeft size={14} />
            Anterior
          </button>

          <span className="text-[11px] text-ink-soft">
            {currentStep + 1} / {steps.length}
          </span>

          <button
            onClick={isLast ? onClose : onNext}
            className="flex items-center gap-1 text-sm font-semibold text-gold hover:text-gold-dark transition-colors"
          >
            {isLast ? 'Concluir' : 'Próximo'}
            {!isLast && <ChevronRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
