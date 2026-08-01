import type { NextResponse } from 'next/server'

/**
 * Adiciona headers que impedem cache de respostas com dados sensíveis.
 * Usar em endpoints que retornam fichas, notas, NPCs ou estado de sessão.
 */
export function withNoCache<T extends NextResponse>(response: T): T {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  response.headers.set('Pragma', 'no-cache')
  return response
}
