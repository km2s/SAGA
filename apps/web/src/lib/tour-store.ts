'use client'

import { useSyncExternalStore } from 'react'

/**
 * Estado do tour de Primeiros Passos, compartilhado entre o widget (layout) e
 * o botão "Primeiros passos" do SagaHeader. Persiste no navegador.
 * Também fica na conta (/api/perfil/tour), para valer em outros dispositivos.
 */
export type TourPhase = 'intro' | 'guide' | 'min' | 'closed'
export type TourStep = 'conta' | 'campanha' | 'mestre' | 'npc' | 'dado' | 'mesa'
export type TourState = { phase: TourPhase; done: Partial<Record<TourStep, 1>>; cur: TourStep }

const KEY = 'saga_tour_v2'
export const TOUR_TOTAL = 6
let state: TourState | null = null
const subs = new Set<() => void>()

function read(): TourState | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as TourState) : null
  } catch { return null }
}

let enviar: ReturnType<typeof setTimeout> | undefined
let lidoDaConta = false
const salvarNaConta = (s: TourState) => {
  clearTimeout(enviar)
  enviar = setTimeout(() => { void fetch('/api/perfil/tour', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) }).catch(() => null) }, 1000)
}

export const tourStore = {
  get: () => state,
  /** Primeira leitura: estado deste navegador, ou o da conta, ou o inicial que o widget calcular. */
  init(fallback: () => TourState) {
    const local = read()
    if (!state) state = local ?? fallback()
    subs.forEach(f => f())
    // Navegador novo: o progresso salvo na conta substitui o inicial.
    if (!local && !lidoDaConta) {
      lidoDaConta = true
      void fetch('/api/perfil/tour').then(r => (r.ok ? r.json() : null)).then((j: { tour?: TourState | null } | null) => {
        if (!j?.tour) return
        state = j.tour
        try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* sem localStorage */ }
        subs.forEach(f => f())
      }).catch(() => null)
    }
  },
  set(up: (s: TourState) => TourState) {
    if (!state) return
    state = up(state)
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* sem localStorage */ }
    salvarNaConta(state)
    subs.forEach(f => f())
  },
  subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f) } },
}

export function useTour() {
  return useSyncExternalStore(tourStore.subscribe, tourStore.get, () => null)
}

/** Avisos que outras telas mandam ao tour (rolagem feita, página visitada). */
export const TOUR_ROLOU = 'saga:tour-rolou'
/** O tour pede à rolagem rápida do Início para rolar 1d20 (CTA "Rolar 1d20"). */
export const TOUR_ROLAR = 'saga:tour-rolar'
export function avisarRolagem(sides: number, v: number) {
  window.dispatchEvent(new CustomEvent(TOUR_ROLOU, { detail: { sides, v } }))
}
