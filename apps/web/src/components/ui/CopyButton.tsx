'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface CopyButtonProps {
  value: string
  label?: string
}

export function CopyButton({ value, label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <code className="font-mono text-gold text-[12px]">{label ?? value}</code>
      <button
        onClick={copy}
        title="Copiar ID"
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-saga-muted hover:text-saga-text hover:bg-surface-3 transition-all"
      >
        {copied ? <Check size={11} className="text-saga-success" /> : <Copy size={11} />}
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    </span>
  )
}
