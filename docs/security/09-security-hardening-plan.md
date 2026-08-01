# Plano de Hardening de Segurança — Saga RPG
**Data:** 2026-06-24  
**Versão:** 1.0

---

## Resumo Executivo

Este documento prioriza as melhorias de segurança identificadas na auditoria em 4 níveis de urgência, com estimativa de esforço e redução de risco esperada.

---

## Nível 1 — Crítico (Implementar Imediatamente)

### HC-01: Atualizar Next.js para corrigir CVE-2025-29927

**Vulnerabilidade:** Bypass de middleware de autenticação via header `x-middleware-subrequest`  
**Impacto:** Acesso não autenticado a todas as rotas `/dashboard/*` e `/campaign/*`  
**Esforço:** 30 minutos  
**Redução de Risco:** Crítica

```bash
pnpm --filter web add next@^14.2.25
# Verificar se build ainda passa:
pnpm --filter web build
```

---

### HC-02: Adicionar Autenticação ao Endpoint de Health Check

**Vulnerabilidade:** CRÍTICO-01 — Hostname do banco exposto publicamente  
**Esforço:** 15 minutos  
**Redução de Risco:** Alta

```typescript
// apps/web/src/app/api/health/route.ts
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    // Retornar apenas status mínimo sem dados de infraestrutura
    return NextResponse.json({ status: 'ok' }, { status: 200 })
  }

  // Versão completa apenas para usuários autenticados
  const start = Date.now()
  let dbStatus: 'ok' | 'error' = 'error'
  let dbLatencyMs: number | null = null

  try {
    await prisma.$queryRaw`SELECT 1`
    dbLatencyMs = Date.now() - start
    dbStatus = 'ok'
  } catch {
    // Não expor detalhes do erro
  }

  return NextResponse.json({
    status: dbStatus,
    db: { connected: dbStatus === 'ok', latencyMs: dbLatencyMs },
    timestamp: new Date().toISOString(),
  }, { status: dbStatus === 'ok' ? 200 : 503 })
}
```

---

### HC-03: Implementar Rate Limiting nos Endpoints Críticos

**Vulnerabilidade:** CRÍTICO-02 — Sem rate limiting (risco de abuso financeiro da Anthropic API)  
**Esforço:** 2-4 horas  
**Redução de Risco:** Crítica

**Opção recomendada: Upstash Redis + @upstash/ratelimit (compatível com Vercel Edge)**

```bash
pnpm --filter web add @upstash/ratelimit @upstash/redis
```

```typescript
// apps/web/src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const rateLimits = {
  // 5 imports por hora por usuário (protege custo da Anthropic)
  characterImport: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix: 'rl:import',
  }),
  // 60 rolagens por minuto por campanha
  diceRoll: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    prefix: 'rl:roll',
  }),
  // 30 heartbeats por minuto por usuário
  presence: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    prefix: 'rl:presence',
  }),
  // 3 re-aplicações por hora por usuário por campanha
  apply: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    prefix: 'rl:apply',
  }),
}

export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<NextResponse | null> {
  const { success, limit, remaining, reset } = await limiter.limit(identifier)
  if (!success) {
    return NextResponse.json(
      { error: 'Muitas requisições. Tente novamente mais tarde.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
          'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      }
    )
  }
  return null
}
```

**Uso em endpoint:**
```typescript
// apps/web/src/app/api/characters/import/route.ts
import { rateLimits, checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit por usuário
  const rateLimitResponse = await checkRateLimit(
    rateLimits.characterImport,
    `user:${session.user.discordId}`
  )
  if (rateLimitResponse) return rateLimitResponse

  // ... resto do handler
}
```

---

## Nível 2 — Alto (Implementar em 1-2 Semanas)

### HC-04: Adicionar Content-Security-Policy

**Vulnerabilidade:** ALTA-01 — Ausência de CSP  
**Esforço:** 2-3 horas  
**Redução de Risco:** Alta

```javascript
// apps/web/next.config.js
async headers() {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https://cdn.discordapp.com https://res.cloudinary.com data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'self' https://www.youtube-nocookie.com",
    "frame-src https://www.youtube-nocookie.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ')

  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'Content-Security-Policy',        value: csp },
        { key: 'Strict-Transport-Security',      value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'X-Content-Type-Options',         value: 'nosniff' },
        { key: 'X-Frame-Options',                value: 'SAMEORIGIN' },
        { key: 'Referrer-Policy',                value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy',             value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Cross-Origin-Resource-Policy',   value: 'same-origin' },
        { key: 'Cross-Origin-Opener-Policy',     value: 'same-origin' },
        // Remover header obsoleto:
        // { key: 'X-XSS-Protection', value: '1; mode=block' },
      ],
    },
  ]
},
```

> ⚠️ **Nota:** Se a aplicação usar `'unsafe-inline'` em `script-src`, a CSP perde eficácia. Verificar se há scripts inline no código e removê-los.

---

### HC-05: Corrigir Prompt Injection no Import de Fichas

**Vulnerabilidade:** ALTA-02 — Prompt injection  
**Esforço:** 30 minutos  
**Redução de Risco:** Alta

```typescript
// apps/web/src/app/api/characters/import/route.ts
const message = await client.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 2048,
  system: EXTRACT_PROMPT,  // ✅ Instrução no campo system
  messages: [
    { role: 'user', content: rawText },  // ✅ Dados do usuário isolados
  ],
})
```

---

### HC-06: Adicionar Allowlist de Hosts para URLs de Imagem

**Vulnerabilidade:** ALTA-03 — SSRF via URLs de imagem  
**Esforço:** 1 hora  
**Redução de Risco:** Alta

```typescript
// apps/web/src/lib/validate-url.ts
const ALLOWED_IMAGE_HOSTS = new Set([
  'cdn.discordapp.com',
  'res.cloudinary.com',
  'i.imgur.com',
  'media.discordapp.net',
])

export function validateImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null

  try {
    const parsed = new URL(trimmed)
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    if (!ALLOWED_IMAGE_HOSTS.has(parsed.hostname)) return null
    return trimmed
  } catch {
    return null
  }
}

// Uso nos endpoints:
const mapImageUrl = validateImageUrl(body.mapImageUrl)
if (body.mapImageUrl !== undefined && mapImageUrl === null && body.mapImageUrl !== null) {
  return NextResponse.json({ error: 'Host de imagem não permitido' }, { status: 400 })
}
```

---

### HC-07: Adicionar Limites de Tamanho em Notas e Handouts

**Vulnerabilidade:** ALTA-04 — Campos sem limite de tamanho  
**Esforço:** 30 minutos  
**Redução de Risco:** Alta

```typescript
// apps/web/src/app/api/campaigns/[id]/notes/route.ts
const note = await prisma.note.create({
  data: {
    title: title?.trim().slice(0, 200) || null,      // ✅
    content: content.trim().slice(0, 50_000),         // ✅
    visibility: visibility ?? 'PRIVATE',
    authorId: user.id,
    campaignId: params.id,
  },
})

// apps/web/src/app/api/campaigns/[id]/handouts/route.ts
const handout = await prisma.handout.create({
  data: {
    title: title?.trim().slice(0, 200) || null,
    content: content?.trim().slice(0, 50_000) || null,
    imageUrl: validateImageUrl(imageUrl),
    campaignId: params.id,
    sharedById: member.id,
  },
})
```

---

### HC-08: Validar Estrutura de markersJson

**Vulnerabilidade:** ALTA-05 — markersJson sem validação  
**Esforço:** 45 minutos  
**Redução de Risco:** Alta

```typescript
// apps/web/src/app/api/campaigns/[id]/sessions/state/route.ts
const MARKERS_MAX_COUNT = 50

function isValidMarkersJson(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return false
    if (parsed.length > MARKERS_MAX_COUNT) return false
    return parsed.every(m =>
      m !== null &&
      typeof m === 'object' &&
      typeof m.x === 'number' &&
      typeof m.y === 'number' &&
      isFinite(m.x) &&
      isFinite(m.y) &&
      // Campos opcionais com tipos esperados:
      (m.color === undefined || (typeof m.color === 'string' && m.color.length <= 20)) &&
      (m.id === undefined || typeof m.id === 'string')
    )
  } catch {
    return false
  }
}

// Substituir no handler:
if ('markersJson' in body) {
  if (body.markersJson === null) {
    data.markersJson = null
  } else if (typeof body.markersJson === 'string') {
    if (Buffer.byteLength(body.markersJson, 'utf8') > 10_000) {
      return NextResponse.json({ error: 'markersJson excede tamanho máximo' }, { status: 413 })
    }
    if (!isValidMarkersJson(body.markersJson)) {
      return NextResponse.json({ error: 'markersJson inválido' }, { status: 400 })
    }
    data.markersJson = body.markersJson
  }
}
```

---

### HC-09: Adicionar HSTS

**Vulnerabilidade:** ALTA-06 — Sem HSTS  
**Esforço:** 5 minutos (incluído em HC-04)  
**Redução de Risco:** Alta

Já incluído em HC-04. Adicionar ao `next.config.js`:
```javascript
{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }
```

---

### HC-10: Reduzir Expiração de JWT para 7 Dias

**Vulnerabilidade:** AUTH-11 — JWT de 30 dias  
**Esforço:** 5 minutos  
**Redução de Risco:** Média

```typescript
// apps/web/src/lib/auth.ts
session: {
  strategy: 'jwt',
  maxAge: 7 * 24 * 60 * 60, // 7 dias
},
```

---

## Nível 3 — Médio (Implementar em 1 Mês)

### HC-11: Adicionar Validação de Schema com Zod

**Esforço:** 4-6 horas (refatorar todos os endpoints)  
**Redução de Risco:** Alta (manutenibilidade + segurança)

```bash
pnpm --filter web add zod
```

```typescript
// apps/web/src/lib/schemas.ts
import { z } from 'zod'

export const noteSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(50_000),
  visibility: z.enum(['PRIVATE', 'CAMPAIGN', 'GM_ONLY']).default('PRIVATE'),
})

export const handoutSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().max(50_000).optional(),
  imageUrl: z.string().url().optional(),
}).refine(d => d.title || d.content || d.imageUrl, {
  message: 'Handout deve ter título, conteúdo ou imagem',
})

export const applySchema = z.object({
  characterDesc: z.string().max(1_000).default(''),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
})

// Uso:
const result = noteSchema.safeParse(body)
if (!result.success) {
  return NextResponse.json(
    { error: 'Dados inválidos', details: result.error.flatten() },
    { status: 400 }
  )
}
const { title, content, visibility } = result.data
```

---

### HC-12: Implementar Logging de Eventos de Segurança

**Esforço:** 3-4 horas  
**Redução de Risco:** Alta (detecção de ataques)

```typescript
// apps/web/src/lib/security-log.ts
type SecurityEvent =
  | 'auth.unauthorized'        // 401
  | 'auth.forbidden'           // 403
  | 'auth.invalid_input'       // 400 em dados de segurança
  | 'rate_limit.exceeded'      // 429
  | 'api.import_used'          // Chamada à Anthropic
  | 'campaign.application'     // Inscrição
  | 'session.started'          // Sessão iniciada
  | 'session.ended'            // Sessão encerrada

interface LogPayload {
  event: SecurityEvent
  userId?: string
  campaignId?: string
  ip?: string
  path?: string
  metadata?: Record<string, unknown>
}

export function logSecurityEvent(payload: LogPayload): void {
  // Em desenvolvimento: console.log
  // Em produção: Sentry, Datadog, ou Vercel Logs
  console.log(JSON.stringify({
    ...payload,
    timestamp: new Date().toISOString(),
    service: 'saga-web',
  }))
}

// Uso:
logSecurityEvent({
  event: 'auth.forbidden',
  userId: session.user.discordId,
  campaignId: params.id,
  path: req.url,
  metadata: { attemptedAction: 'createNPC', role: member.role },
})
```

---

### HC-13: Adicionar Cache-Control em APIs Sensíveis

**Esforço:** 1-2 horas  
**Redução de Risco:** Média

```typescript
// Utilitário:
export function withNoCache(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  response.headers.set('Pragma', 'no-cache')
  return response
}

// Uso em endpoints com dados sensíveis:
return withNoCache(NextResponse.json(npc))
```

---

### HC-14: Validar Expiração e Estrutura de Resposta da IA

**Esforço:** 30 minutos  
**Redução de Risco:** Média

```typescript
// Após receber resposta do Claude:
extracted.attributes = extracted.attributes
  .slice(0, 100)  // Máximo 100 atributos
  .filter(a =>
    typeof a.name === 'string' &&
    a.name.trim().length > 0 &&
    a.name.length <= 100 &&
    (a.value === null || (typeof a.value === 'number' && isFinite(a.value)))
  )
  .map(a => ({
    name: a.name.trim().slice(0, 100),
    value: typeof a.value === 'string' ? parseValue(a.value) :
           (typeof a.value === 'number' ? a.value : null),
  }))

if (extracted.characterName) {
  extracted.characterName = String(extracted.characterName).slice(0, 100)
}
```

---

### HC-15: Adicionar SameSite=Strict nos Cookies

**Esforço:** 15 minutos  
**Redução de Risco:** Média

```typescript
// apps/web/src/lib/auth.ts
export const authOptions: NextAuthOptions = {
  // ...
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
}
```

---

## Nível 4 — Baixo (Implementar em 3 Meses)

### HC-16: Criar Pipeline de CI/CD com Verificações de Segurança

**Esforço:** 4-8 horas  
**Redução de Risco:** Alta (prevenção proativa)

```yaml
# .github/workflows/security.yml
name: Security Checks

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      
      - run: pnpm install --frozen-lockfile
      
      - name: Audit Dependencies
        run: pnpm audit --audit-level moderate
      
      - name: TypeScript Check
        run: pnpm --filter web tsc --noEmit
      
      - name: Build Check
        run: pnpm --filter web build
```

---

### HC-17: Adicionar Paginação em Endpoints de Lista

**Esforço:** 2-3 horas  
**Redução de Risco:** Média (DoS por dados grandes)

```typescript
// apps/web/src/app/api/campaigns/open/route.ts
const url = new URL(req.url)
const page = Math.max(0, parseInt(url.searchParams.get('page') ?? '0'))
const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('size') ?? '20')))

const campaigns = await prisma.campaign.findMany({
  where: { isOpen: true },
  take: pageSize,
  skip: page * pageSize,
  orderBy: { createdAt: 'desc' },
  // ...
})
```

---

### HC-18: Validação de Magic Bytes em Upload de Arquivo

**Esforço:** 1 hora  
**Redução de Risco:** Média

```typescript
function validateFileMagicBytes(buffer: Buffer, expectedType: 'pdf' | 'html'): boolean {
  if (expectedType === 'pdf') {
    return buffer.slice(0, 5).toString('ascii') === '%PDF-'
  }
  const header = buffer.slice(0, 100).toString('utf8').toLowerCase()
  return header.includes('<!doctype html') || header.includes('<html')
}
```

---

### HC-19: Validar Entropia do NEXTAUTH_SECRET

**Esforço:** 15 minutos  
**Redução de Risco:** Alta (se secret for fraco)

```typescript
// apps/web/src/lib/auth.ts — adicionar no início do arquivo
if (process.env.NODE_ENV === 'production') {
  if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {
    throw new Error('NEXTAUTH_SECRET deve ter pelo menos 32 caracteres em produção')
  }
}
```

---

## Roadmap de Implementação

```
Semana 1 (Crítico):
  ✅ HC-01: Atualizar Next.js (CVE-2025-29927)
  ✅ HC-02: Autenticação no health check
  ✅ HC-03: Rate limiting nos endpoints críticos
  ✅ HC-05: Corrigir prompt injection
  ✅ HC-09: HSTS

Semana 2 (Alto):
  ✅ HC-04: Content-Security-Policy
  ✅ HC-06: Allowlist de hosts para URLs
  ✅ HC-07: Limites de tamanho em notas/handouts
  ✅ HC-08: Validar markersJson
  ✅ HC-10: JWT expiração 7 dias

Mês 1 (Médio):
  ✅ HC-11: Zod para validação de schema
  ✅ HC-12: Logging de eventos de segurança
  ✅ HC-13: Cache-Control em APIs sensíveis
  ✅ HC-14: Validar resposta da IA
  ✅ HC-15: SameSite=Strict

Trimestre (Baixo):
  ✅ HC-16: CI/CD com verificações de segurança
  ✅ HC-17: Paginação em endpoints de lista
  ✅ HC-18: Magic bytes em upload
  ✅ HC-19: Validar entropia do NEXTAUTH_SECRET
```

---

## Estimativa de Esforço Total

| Nível | Itens | Esforço Estimado |
|---|---|---|
| Crítico (Semana 1) | 5 | ~6-8 horas |
| Alto (Semana 2) | 5 | ~5-7 horas |
| Médio (Mês 1) | 5 | ~8-12 horas |
| Baixo (Trimestre) | 4 | ~8-14 horas |
| **Total** | **19** | **~27-41 horas** |
