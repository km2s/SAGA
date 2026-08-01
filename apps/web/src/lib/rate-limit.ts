import { NextResponse } from 'next/server'

// Rate limiting em memória — protege contra abusos por usuário dentro de uma instância.
// Para produção com múltiplas instâncias (Vercel), configure Upstash Redis:
//   1. Crie conta em https://upstash.com e um banco Redis
//   2. Adicione UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN no .env
//   3. Execute: pnpm --filter web add @upstash/ratelimit @upstash/redis
//   4. Substitua esta implementação pela versão Upstash

interface Entry {
  count: number
  resetAt: number
}

const store = new Map<string, Entry>()

function cleanup() {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key)
  }
}

function check(key: string, max: number, windowMs: number): boolean {
  if (Math.random() < 0.05) cleanup()
  const now = Date.now()
  const entry = store.get(key)
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= max) return false
  entry.count++
  return true
}

export const RATE_LIMITS = {
  // 5 imports de ficha por hora por usuário — protege custo da Anthropic API
  characterImport: { max: 5, windowMs: 60 * 60 * 1000 },
  // 120 rolagens por minuto por campanha
  diceRoll: { max: 120, windowMs: 60 * 1000 },
  // 40 heartbeats por minuto por usuário
  presence: { max: 40, windowMs: 60 * 1000 },
  // 5 inscrições por hora por usuário por campanha
  apply: { max: 5, windowMs: 60 * 60 * 1000 },
  // 30 requisições de estado por minuto por membro
  sessionState: { max: 30, windowMs: 60 * 1000 },
} as const

export function applyRateLimit(
  key: string,
  config: { max: number; windowMs: number },
): NextResponse | null {
  const allowed = check(key, config.max, config.windowMs)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Muitas requisições. Tente novamente mais tarde.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(config.windowMs / 1000)) } },
    )
  }
  return null
}
