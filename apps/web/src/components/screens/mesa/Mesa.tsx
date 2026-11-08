'use client'

import { Template } from './Template'
import { useMesaVals, type MesaDados } from './vals'
import './mesa-extra.css'

export function Mesa({ dados }: { dados: MesaDados }) {
  const v = useMesaVals(dados)
  return (
    // Tela cheia por cima do header do app, como a Mesa atual.
    <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
      <Template v={v} />
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
