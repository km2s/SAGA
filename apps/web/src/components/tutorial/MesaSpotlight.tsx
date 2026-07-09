'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight, X, Check } from 'lucide-react'

const STORAGE_KEY = 'saga_mesa_spotlight_done'

interface SpotlightStep {
  target: string
  title: string
  description: string
  position: 'top' | 'bottom' | 'left' | 'right'
}

const GM_STEPS: SpotlightStep[] = [
  {
    target: 'toolbar',
    title: 'Ferramentas da Mesa',
    description: 'Selecione e mova tokens, navegue pelo mapa (pan), coloque tokens, pinge localizações, meça distâncias e aplique névoa de guerra.',
    position: 'right',
  },
  {
    target: 'canvas',
    title: 'Mapa e Tokens',
    description: 'Arraste tokens para posicioná-los no grid. Clique com o botão direito em um token para removê-lo. Scroll ou pinça para dar zoom.',
    position: 'top',
  },
  {
    target: 'topbar-sheets',
    title: 'Fichas dos Personagens',
    description: 'Acesse as fichas completas de todos os jogadores e NPCs sem sair da mesa.',
    position: 'bottom',
  },
  {
    target: 'topbar-map',
    title: 'Imagem do Mapa',
    description: 'Cole a URL de qualquer imagem para usá-la como fundo — dungeon, cidade, floresta. A imagem é renderizada na origem do mapa.',
    position: 'bottom',
  },
  {
    target: 'topbar-music',
    title: 'Música Ambiente',
    description: 'Cole um link do YouTube para tocar música de fundo durante a sessão. O volume é sincronizado automaticamente para todos os jogadores.',
    position: 'bottom',
  },
  {
    target: 'dice',
    title: 'Rolagem de Dados',
    description: 'Clique em qualquer dado para rolar durante a sessão. Os resultados — incluindo críticos — aparecem no chat ao vivo para todos.',
    position: 'top',
  },
  {
    target: 'session-banner',
    title: 'Controle de Sessão',
    description: 'Inicie uma sessão para sincronizar tokens, mapas, dados e música com todos os jogadores em tempo real.',
    position: 'bottom',
  },
  // Session-dependent steps (only shown when active session exists in DOM)
  {
    target: 'topbar-initiative',
    title: 'Ordem de Iniciativa',
    description: 'Role iniciativa automática para todos os tokens e avance os turnos de combate com um clique.',
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
    description: 'Cada token representa um personagem na mesa. Você pode arrastar o seu token para se mover pelo mapa.',
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
    description: 'Role dados durante a sessão. Críticos e falhas críticas aparecem em destaque para todos no chat!',
    position: 'top',
  },
]

const PAD = 10

interface Rect { left: number; top: number; width: number; height: number }

function getElementRect(target: string): Rect | null {
  const el = document.querySelector(`[data-mesa-tutorial="${target}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) return null
  return {
    left: r.left - PAD,
    top: r.top - PAD,
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
  }
}

function tooltipPos(rect: Rect, position: SpotlightStep['position'], ww: number) {
  const W = 280
  const GAP = 16
  switch (position) {
    case 'right': return {
      left: Math.min(rect.left + rect.width + GAP, ww - W - 12),
      top: Math.max(rect.top + rect.height / 2 - 90, 12),
    }
    case 'left': return {
      left: Math.max(rect.left - W - GAP, 12),
      top: Math.max(rect.top + rect.height / 2 - 90, 12),
    }
    case 'bottom': return {
      left: Math.min(Math.max(rect.left + rect.width / 2 - W / 2, 12), ww - W - 12),
      top: rect.top + rect.height + GAP,
    }
    default: return {
      left: Math.min(Math.max(rect.left + rect.width / 2 - W / 2, 12), ww - W - 12),
      top: Math.max(rect.top - 180 - GAP, 12),
    }
  }
}

export function MesaSpotlight({ isGM }: { isGM: boolean }) {
  const [mounted, setMounted]           = useState(false)
  const [active, setActive]             = useState(false)
  const [availableSteps, setAvailable]  = useState<SpotlightStep[]>([])
  const [stepIdx, setStepIdx]           = useState(0)
  const [rect, setRect]                 = useState<Rect | null>(null)
  const [ww, setWw]                     = useState(0)
  const rafRef                          = useRef<number>(0)

  const allSteps = isGM ? GM_STEPS : PLAYER_STEPS

  function filterSteps() {
    return allSteps.filter(s => !!getElementRect(s.target))
  }

  const refreshRect = useCallback((steps: SpotlightStep[], idx: number) => {
    const step = steps[idx]
    if (!step) return
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      setRect(getElementRect(step.target))
      setWw(window.innerWidth)
    })
  }, [])

  useEffect(() => {
    setMounted(true)

    function handleReplay() {
      const steps = filterSteps()
      if (steps.length === 0) return
      localStorage.removeItem(STORAGE_KEY)
      setAvailable(steps)
      setStepIdx(0)
      setActive(true)
      refreshRect(steps, 0)
    }
    window.addEventListener('saga:mesa-tutorial', handleReplay)

    if (localStorage.getItem(STORAGE_KEY) !== 'true') {
      const t = setTimeout(() => {
        const steps = filterSteps()
        if (steps.length === 0) { localStorage.setItem(STORAGE_KEY, 'true'); return }
        setAvailable(steps)
        setStepIdx(0)
        setActive(true)
        refreshRect(steps, 0)
      }, 1200)
      return () => {
        clearTimeout(t)
        window.removeEventListener('saga:mesa-tutorial', handleReplay)
      }
    }

    return () => window.removeEventListener('saga:mesa-tutorial', handleReplay)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!active || availableSteps.length === 0) return
    refreshRect(availableSteps, stepIdx)
  }, [stepIdx, active, availableSteps, refreshRect])

  useEffect(() => {
    if (!active) return
    function onResize() { refreshRect(availableSteps, stepIdx) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [active, stepIdx, availableSteps, refreshRect])

  function close() {
    localStorage.setItem(STORAGE_KEY, 'true')
    setActive(false)
  }

  function next() {
    if (stepIdx < availableSteps.length - 1) setStepIdx(i => i + 1)
    else close()
  }

  if (!mounted) return null

  const step = availableSteps[stepIdx]
  const tStyle = rect && step ? tooltipPos(rect, step.position, ww) : { left: '50%', top: '50%' }

  return (
    <>
      {/* Spotlight overlay */}
      {active && step && createPortal(
        <div className="fixed inset-0 z-[9000]" onClick={next}>
          {/* SVG overlay with hole */}
          <svg
            style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
            aria-hidden
          >
            <defs>
              <mask id="mesa-spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                {rect && (
                  <rect
                    x={rect.left} y={rect.top}
                    width={rect.width} height={rect.height}
                    rx="8" fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              width="100%" height="100%"
              fill="rgba(0,0,0,0.78)"
              mask="url(#mesa-spotlight-mask)"
            />
            {rect && (
              <rect
                x={rect.left} y={rect.top}
                width={rect.width} height={rect.height}
                rx="8" fill="none"
                stroke="rgba(201,162,42,0.65)" strokeWidth="1.5"
              />
            )}
          </svg>

          {/* Tooltip */}
          <div
            className="fixed z-[9001] w-[280px] rounded-xl overflow-hidden shadow-2xl"
            style={{
              ...tStyle,
              background: 'rgba(18,16,11,0.97)',
              border: '1px solid rgba(201,162,42,0.30)',
              backdropFilter: 'blur(12px)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent" />
            <div className="p-4">
              {/* Dots + close */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex gap-1">
                  {availableSteps.map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-full transition-all duration-300 ${
                        i === stepIdx ? 'w-4 h-1.5 bg-gold' : i < stepIdx ? 'w-1.5 h-1.5 bg-gold/40' : 'w-1.5 h-1.5 bg-white/15'
                      }`}
                    />
                  ))}
                </div>
                <button onClick={close} className="text-saga-dim hover:text-saga-text transition-colors">
                  <X size={13} />
                </button>
              </div>
              <h3 className="font-cinzel text-[13px] font-bold mb-1.5" style={{ color: '#f0d060' }}>
                {step.title}
              </h3>
              <p className="text-[12px] text-saga-muted leading-relaxed">{step.description}</p>
            </div>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={close} className="text-[11px] text-saga-dim hover:text-saga-muted transition-colors">
                Pular
              </button>
              <button
                onClick={next}
                className="flex items-center gap-1.5 text-[12px] font-semibold transition-colors"
                style={{ color: '#c9a22a' }}
              >
                {stepIdx < availableSteps.length - 1 ? <>Próximo <ChevronRight size={13} /></> : <>Concluir <Check size={13} /></>}
              </button>
            </div>
          </div>

          <p className="fixed bottom-6 left-1/2 -translate-x-1/2 text-[11px] text-white/25 pointer-events-none select-none">
            Clique em qualquer lugar para avançar
          </p>
        </div>,
        document.body
      )}
    </>
  )
}
