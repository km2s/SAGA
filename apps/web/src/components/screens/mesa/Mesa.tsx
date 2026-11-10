'use client'

import { useSyncExternalStore } from 'react'
import { Template } from './Template'
import { useMesaVals, type MesaDados } from './vals'
import { Template as TemplateCelular } from '@/components/screens/mesacelular/Template'
import { useMesaCelularVals } from '@/components/screens/mesacelular/vals'
import './mesa-extra.css'

// Abaixo de 760 px a Mesa usa o layout de celular (SAGA Mesa Celular).
const CELULAR = '(max-width: 759px)'
const assinar = (cb: () => void) => { const q = window.matchMedia(CELULAR); q.addEventListener('change', cb); return () => q.removeEventListener('change', cb) }

export function Mesa({ dados }: { dados: MesaDados }) {
  const v = useMesaVals(dados)
  const vc = useMesaCelularVals(v)
  const celular = useSyncExternalStore(assinar, () => window.matchMedia(CELULAR).matches, () => false)
  return (
    // Tela cheia por cima do header do app, como a Mesa antiga.
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, overflow: 'auto' }}>
      {celular ? <TemplateCelular v={vc} /> : <Template v={v} />}
      {v.musicaSrc && (
        <iframe
          key={v.musicaSrc}
          ref={v.iframeRef}
          src={v.musicaSrc}
          onLoad={v.onMusicaLoad}
          allow="autoplay"
          title="Música da mesa"
          style={{ position: 'fixed', width: 0, height: 0, opacity: 0, pointerEvents: 'none', border: 0 }}
        />
      )}
    </div>
  )
}
