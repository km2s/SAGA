'use client'

import { useEffect, useState } from 'react'
import { Loader, RotateCcw } from 'lucide-react'
import { dcHref } from '@/lib/dc-routes'
import { toggleTema } from '@/lib/tema'

/** 404 (app/not-found.tsx) e 500 (app/error.tsx). `codigo` = digest do erro do Next. */
export type ErroDados = { tipo: '404' | '500'; codigo?: string | null; tentar?: () => void }

export function useErroVals(d: ErroDados) {
  const e500 = d.tipo === '500'
  const [busy, setBusy] = useState(false)
  const [roll, setRoll] = useState(0)
  const [talk, setTalk] = useState(false)
  useEffect(() => { const iv = setInterval(() => setTalk(t => !t), 2400); return () => clearInterval(iv) }, [])
  return {
    $href: (link: string) => dcHref(link, {}),
    toggleTema, falando: talk,
    is500: e500, code: e500 ? 'ERRO 500' : 'ERRO 404', face: '1', faceC: '#c8424c', dieAnim: roll ? 'erro-spin .7s cubic-bezier(.2,.7,.3,1) both' : 'none',
    title: e500 ? 'Algo se quebrou na mesa' : 'Este mapa termina aqui',
    lead: e500 ? 'Uma falha crítica do nosso lado, não do seu. Nada do que você escreveu se perdeu. Tente de novo em instantes.' : 'Falha crítica na Navegação: o caminho que você seguiu não leva a lugar nenhum. Talvez o link esteja velho ou a campanha tenha sido arquivada.',
    retryL: busy ? 'Tentando…' : 'Tentar de novo', retryIcon: busy ? Loader : RotateCcw,
    retry: () => {
      if (busy) return
      setBusy(true); setRoll(r => r + 1)
      // O dado gira e a página tenta de novo (reset do error boundary do Next).
      setTimeout(() => { setBusy(false); d.tentar?.() }, 700)
    },
    temRef: !!d.codigo, ref: d.codigo ?? '',
  }
}

export type Vals = ReturnType<typeof useErroVals>
