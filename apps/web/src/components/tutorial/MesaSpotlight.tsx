'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight, X } from 'lucide-react'

const STORAGE_KEY = 'saga_mesa_spotlight_done'

interface SpotlightStep {
  target: string   // data-mesa-tutorial value
  title: string
  description: string
  position: 'top' | 'bottom' | 'left' | 'right'
}

const GM_STEPS: SpotlightStep[] = [
  {
    target: 'toolbar',
    title: 'Ferramentas da Mesa',
    description: 'Selecione, mova a câmera, coloque tokens, pinge localizações, meça distâncias e aplique névoa de guerra.',
    position: 'right',
  },
  {
    target: 'canvas',
    title: 'Mapa e Tokens',
    description: 'Arraste tokens para posicioná-los no grid. Clique com o botão direito para remover. Use o scroll ou pinça para dar zoom.',
    position: 'top',
  },
  {
    target: 'topbar-sheets',
    title: 'Fichas dos Personagens',
    description: 'Acesse as fichas completas de todos os jogadores e NPCs sem sair da mesa.',
    position: 'bottom',
  },
  {
    target: 'topbar-initiative',
    title: 'Ordem de Iniciativa',
    description: 'Role iniciativa automática para todos os tokens e avance o turno com um clique.',
    position: 'bottom',
  },
  {
    target: 'topbar-map',
    title: 'Imagem do Mapa',
    description: 'Cole a URL de qualquer imagem para usá-la como fundo do mapa — dungeon, cidade, o que quiser.',
    position: 'bottom',
  },
  {
    target: 'dice',
    title: 'Rolagem de Dados',
    description: 'Clique em qualquer dado para rolar durante a sessão. Os resultados aparecem no chat ao vivo para todos os jogadores.',
    position: 'top',
  },
  {
    target: 'session-banner',
    title: 'Controle de Sessão',
    description: 'Inicie uma sessão para sincronizar tokens, dados e música com todos os jogadores em tempo real.',
    position: 'bottom',
  },
]

const PLAYER_STEPS: SpotlightStep[] = [
  {
    target: 'toolbar',
    title: 'Ferramentas da Mesa',
    description: 'Mova a câmera para explorar o mapa, coloque seu token ou pinge localizações para chamar atenção do grupo.',
    position: 'right',
  },
  {
    target: 'canvas',
    title: 'Mapa e Tokens',
    description: 'Cada token representa um personagem. O Mestre controla o mapa — você pode mover o seu token.',
    position: 'top',
  },
  {
    target: 'topbar-sheets',
    title: 'Sua Ficha',
    description: 'Acesse sua ficha de personagem completa sem sair da mesa durante a sessão.',
    position: 'bottom',
  },
  {
    target: 'dice',
    title: 'Rolagem de Dados',
    description: 'Role dados durante a sessão. Críticos e falhas críticas aparecem em destaque para todos!',
    position: 'top',
  },
]

interface Rect { left: number; top: number; width: number; height: number }

const PAD = 10

function getRect(target: string): Rect | null {
  const el = document.querySelector(`[data-mesa-tutorial="${target}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return {
    left: r.left - PAD,
    top: r.top - PAD,
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
  }
}

function tooltipStyle(rect: Rect, position: SpotlightStep['position'], ww: number, wh: number) {
  const TOOLTIP_W = 280
  const TOOLTIP_GAP = 16

  switch (position) {
    case 'right': return {
      left: Math.min(rect.left + rect.width + TOOLTIP_GAP, ww - TOOLTIP_W - 12),
      top: rect.top + rect.height / 2 - 80,
    }
    case 'left': return {
      left: Math.max(rect.left - TOOLTIP_W - TOOLTIP_GAP, 12),
      top: rect.top + rect.height / 2 - 80,
    }
    case 'bottom': return {
      left: Math.min(Math.max(rect.left + rect.width / 2 - TOOLTIP_W / 2, 12), ww - TOOLTIP_W - 12),
      top: rect.top + rect.height + TOOLTIP_GAP,
    }
    case 'top':
    default: return {
      left: Math.min(Math.max(rect.left + rect.width / 2 - TOOLTIP_W / 2, 12), ww - TOOLTIP_W - 12),
      top: Math.max(rect.top - 170 - TOOLTIP_GAP, 12),
    }
  }
}

export function MesaSpotlight({ isGM }: { isGM: boolean }) {
  const [mounted, setMounted]       = useState(false)
  const [active, setActive]         = useState(false)
  const [stepIdx, setStepIdx]       = useState(0)
  const [rect, setRect]             = useState<Rect | null>(null)
  const [wDim, setWDim]             = useState({ w: 0, h: 0 })

  const steps = isGM ? GM_STEPS : PLAYER_STEPS

  const updateRect = useCallback((idx: number) => {
    const step = steps[idx]
    if (!step) return
    setRect(getRect(step.target))
    setWDim({ w: window.innerWidth, h: window.innerHeight })
  }, [steps])

  useEffect(() => {
    setMounted(true)
    if (localStorage.getItem(STORAGE_KEY) !== 'true') {
      // Small delay so the canvas renders first
      const t = setTimeout(() => {
        setActive(true)
        updateRect(0)
      }, 1200)
      return () => clearTimeout(t)
    }
  }, [updateRect])

  useEffect(() => {
    if (!active) return
    updateRect(stepIdx)
  }, [stepIdx, active, updateRect])

  useEffect(() => {
    if (!active) return
    function onResize() { updateRect(stepIdx) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [active, stepIdx, updateRect])

  function close() {
    localStorage.setItem(STORAGE_KEY, 'true')
    setActive(false)
  }

  function next() {
    if (stepIdx < steps.length - 1) {
      setStepIdx(i => i + 1)
    } else {
      close()
    }
  }

  if (!mounted || !active) return null

  const step = steps[stepIdx]!
  const tStyle = rect ? tooltipStyle(rect, step.position, wDim.w, wDim.h) : { left: 0, top: 0 }

  const modal = (
    <div className="fixed inset-0 z-[9000]" onClick={next}>
      {/* SVG overlay with cutout hole */}
      <svg
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        aria-hidden
      >
        <defs>
          <mask id="mesa-spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left}
                y={rect.top}
                width={rect.width}
                height={rect.height}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.78)"
          mask="url(#mesa-spotlight-mask)"
        />
        {/* Highlight ring */}
        {rect && (
          <rect
            x={rect.left}
            y={rect.top}
            width={rect.width}
            height={rect.height}
            rx="8"
            fill="none"
            stroke="rgba(201,162,42,0.6)"
            strokeWidth="1.5"
          />
        )}
      </svg>

      {/* Tooltip */}
      <div
        className="fixed z-[9001] w-[280px] rounded-xl shadow-2xl overflow-hidden"
        style={{
          ...tStyle,
          background: 'rgba(14,14,28,0.97)',
          border: '1px solid rgba(201,162,42,0.3)',
          backdropFilter: 'blur(12px)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Gold top line */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent" />

        <div className="p-4">
          {/* Step indicator + close */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    i === stepIdx ? 'w-4 h-1.5 bg-gold' : i < stepIdx ? 'w-1.5 h-1.5 bg-gold/40' : 'w-1.5 h-1.5 bg-white/15'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={close}
              className="text-saga-dim hover:text-saga-text transition-colors"
            >
              <X size={13} />
            </button>
          </div>

          <h3
            className="font-cinzel text-[13px] font-bold mb-1.5"
            style={{ color: '#f0d060' }}
          >
            {step.title}
          </h3>
          <p className="text-[12px] text-saga-muted leading-relaxed">{step.description}</p>
        </div>

        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={close}
            className="text-[11px] text-saga-dim hover:text-saga-muted transition-colors"
          >
            Pular tutorial
          </button>
          <button
            onClick={next}
            className="flex items-center gap-1.5 text-[12px] font-semibold transition-colors"
            style={{ color: '#c9a22a' }}
          >
            {stepIdx < steps.length - 1 ? (
              <>Próximo <ChevronRight size={13} /></>
            ) : (
              'Concluir ✓'
            )}
          </button>
        </div>
      </div>

      {/* Click hint */}
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 text-[11px] text-white/30 pointer-events-none"
      >
        Clique em qualquer lugar para avançar
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
