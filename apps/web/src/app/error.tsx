'use client'

import { useEffect } from 'react'
import { Erro } from '@/components/screens/erro/Erro'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  // Referência de suporte: o digest que o Next registra no log do servidor.
  const codigo = error.digest ? error.digest.slice(0, 8).toUpperCase().replace(/^(.{4})/, '$1-') : null
  return <Erro tipo="500" codigo={codigo} tentar={reset} />
}
