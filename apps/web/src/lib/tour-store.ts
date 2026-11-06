'use client'

import { useSyncExternalStore } from 'react'

/**
 * Estado do tour de Primeiros Passos, compartilhado entre o widget (layout) e
 * o botão "Primeiros passos" do SagaHeader. Persiste no navegador.
 * TODO(api): guardar o progresso no usuário, para valer em outros dispositivos.
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

export const tourStore = {
  get: () => state,
  /** Primeira leitura: estado salvo, ou o inicial que o widget calcular. */
  init(fallback: () => TourState) {
    if (!state) state = read() ?? fallback()
    subs.forEach(f => f())
  },
  set(up: (s: TourState) => TourState) {
    if (!state) return
    state = up(state)
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* sem localStorage */ }
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
