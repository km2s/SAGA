# Revisão de Validação de Input — Saga RPG
**Data:** 2026-06-24  
**Versão:** 1.0

---

## 1. Visão Geral

O Saga RPG não usa bibliotecas de validação de schema (como Zod, Yup ou Joi). A validação é realizada manualmente em cada endpoint, com padrões ad-hoc que variam em qualidade e completude entre os arquivos.

**Inventário de padrões de validação encontrados:**
- Type guards (`typeof x === 'string'`)
- Whitelist de valores (`['a', 'b'].includes(x)`)
- Regex de formato
- Limites de tamanho (`.slice(0, N)`)
- Limites numéricos (`Math.max`, `Math.min`)
- Validação de URL via `new URL()` ou regex
- Validação de estrutura JSON customizada

---

## 2. Análise por Endpoint

### 2.1 `/api/characters/import` — Upload de Arquivo

**Arquivo:** `apps/web/src/app/api/characters/import/route.ts`

| Campo | Validação | Status |
|---|---|---|
| Tamanho do arquivo | `file.size > 5MB` | ✅ |
| Tipo de arquivo | MIME type + extensão | ⚠️ Bypassável |
| Conteúdo do PDF | `rawText.slice(0, 12000)` | ✅ |
| Conteúdo do HTML | `extractFromHtml()` + `slice(0, 12000)` | ✅ |
| Resposta da IA | `JSON.parse` + `Array.isArray(attributes)` | ⚠️ Insuficiente |
| Atributos retornados | Filtro de `name?.trim()` | ⚠️ Sem limite de quantidade |

**VAL-01 — Bypass de tipo de arquivo:**
```typescript
// Vulnerável: atacante pode renomear arquivo malicioso
if (mime === 'application/pdf' || name.endsWith('.pdf')) {
  // Processa como PDF
}
```
Um arquivo HTML com `Content-Type: application/pdf` e nome `hack.pdf` seria processado como PDF. O `pdf-parse` pode falhar graciosamente, mas dependendo do conteúdo, pode processar texto mal-formado.

**VAL-02 — Validação insuficiente da resposta da IA:**
```typescript
// Apenas verifica que é array — não valida:
// - Número de atributos (pode retornar 10.000)
// - Tamanho dos strings de nome/valor
// - Tipos dos campos individuais
if (!Array.isArray(extracted.attributes)) throw new Error('Invalid shape')
```

**Melhoria recomendada:**
```typescript
// Após JSON.parse:
if (!Array.isArray(extracted.attributes)) throw new Error()
if (extracted.attributes.length > 100) throw new Error('Too many attributes')
extracted.attributes = extracted.attributes.slice(0, 100).filter(a => 
  typeof a.name === 'string' && 
  a.name.length <= 100 &&
  (a.value === null || typeof a.value === 'number')
)
if (extracted.characterName && typeof extracted.characterName === 'string') {
  extracted.characterName = extracted.characterName.slice(0, 100)
}
```

---

### 2.2 `/api/campaigns/[id]/sessions/state` — Estado da Mesa Virtual

**Arquivo:** `apps/web/src/app/api/campaigns/[id]/sessions/state/route.ts`

| Campo | Validação | Status |
|---|---|---|
| `tokensJson` | `isValidTokensJson()` + tamanho 200KB | ✅ |
| `markersJson` | Apenas `length < 10000` | ❌ Estrutura não validada |
| `musicYoutubeId` | Regex `[a-zA-Z0-9_-]{11}` | ✅ |
| `musicVolume` | `Math.max(0, Math.min(100, ...))` | ✅ |
| `mapImageUrl` | Regex `^https?:\/\/` | ⚠️ Sem allowlist de host |
| `liveMembersJson` | Array de strings | ✅ |

**VAL-03 — markersJson sem validação de estrutura:**
```typescript
// Aceita qualquer string < 10000 chars
} else if (typeof body.markersJson === 'string' && body.markersJson.length < 10000) {
  data.markersJson = body.markersJson  // ❌
}
```

Recomendação:
```typescript
function isValidMarkersJson(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return false
    return parsed.every(m =>
      m !== null && typeof m === 'object' &&
      typeof m.x === 'number' &&
      typeof m.y === 'number' &&
      typeof m.color === 'string' &&
      m.color.length <= 20
    )
  } catch { return false }
}
```

**VAL-04 — mapImageUrl sem allowlist de host:**
```typescript
if (trimmed && !/^https?:\/\//i.test(trimmed)) {
  return NextResponse.json({ error: 'mapImageUrl inválida' }, { status: 400 })
}
// ✅ Protocolo validado, mas ❌ host não validado
// Aceita: https://169.254.169.254/metadata (potencial SSRF)
```

---

### 2.3 `/api/campaigns/[id]/rolls` — Rolagem de Dados

**Arquivo:** `apps/web/src/app/api/campaigns/[id]/rolls/route.ts`

| Campo | Validação | Status |
|---|---|---|
| `expression` | Regex `DICE_RE` + limites | ✅ |
| `attribute` | `slice(0, 80)` | ✅ |
| `message` (chat) | `slice(0, 500)` | ✅ |
| Contagem de dados | `1 ≤ count ≤ 100` | ✅ |
| Lados | `2 ≤ sides ≤ 1000` | ✅ |
| Modificador | `abs(modifier) ≤ 10000` | ✅ |

**✅ Este endpoint tem a validação mais robusta da aplicação.** Modelo a ser seguido.

---

### 2.4 `/api/campaigns/[id]/apply` — Inscrição em Campanha

**Arquivo:** `apps/web/src/app/api/campaigns/[id]/apply/route.ts`

| Campo | Validação | Status |
|---|---|---|
| `characterDesc` | `typeof === 'string' + trim + slice(0, 1000)` | ✅ |
| `experienceLevel` | Whitelist `['beginner', 'intermediate', 'advanced']` | ✅ |
| `campaignId` (URL) | UUID via Prisma query | ✅ |
| Rate limiting | Ausente | ❌ |

---

### 2.5 `/api/campaigns/[id]/notes` — Criação de Notas

**Arquivo:** `apps/web/src/app/api/campaigns/[id]/notes/route.ts`

| Campo | Validação | Status |
|---|---|---|
| `content` | `.trim()` (sem limite de tamanho) | ❌ |
| `title` | `.trim()` (sem limite de tamanho) | ❌ |
| `visibility` | Whitelist `['PRIVATE', 'CAMPAIGN', 'GM_ONLY']` | ✅ |

**VAL-05 — Campos sem limite de tamanho:**
```typescript
// ❌ Sem slice():
note = await prisma.note.create({
  data: {
    title: title?.trim() || null,
    content: content.trim(),
    // Sem limites!
  }
})
```

---

### 2.6 `/api/campaigns/[id]/handouts` — Handouts

**Arquivo:** `apps/web/src/app/api/campaigns/[id]/handouts/route.ts`

| Campo | Validação | Status |
|---|---|---|
| `title` | `.trim()` (sem limite) | ⚠️ |
| `content` | `.trim()` (sem limite) | ⚠️ |
| `imageUrl` | `new URL()` com verificação de protocolo | ⚠️ Sem allowlist |

**VAL-06 — imageUrl sem allowlist de host:**
```typescript
const { protocol } = new URL(imageUrl)
if (!['https:', 'http:'].includes(protocol)) {
  return NextResponse.json({ error: 'URL de imagem inválida' }, { status: 400 })
}
// ❌ Qualquer host HTTPS é aceito
```

---

### 2.7 `/api/campaigns/[id]/sessions/[sessionId]/summary` — Resumo de Sessão

| Campo | Validação | Status |
|---|---|---|
| `content` | `.trim().slice(0, 10000)` | ✅ |

---

## 3. Análise de Injeção

### 3.1 SQL Injection

**Status: ✅ Protegido**

Toda a interação com o banco de dados usa Prisma ORM com queries parametrizadas. Não há concatenação de SQL, `$queryRawUnsafe`, ou interpolação de strings em queries.

A única exceção é `prisma.$queryRaw\`SELECT 1\`` no health check — que é um template literal sem interpolação de variáveis externas.

### 3.2 NoSQL Injection

**Status: N/A** — O banco de dados é PostgreSQL (não MongoDB), então injeção NoSQL não se aplica. Os campos JSON (`tokensJson`, `markersJson`) são armazenados como strings e parseados/gerados no código TypeScript, não passados diretamente para query operators.

### 3.3 XSS (Cross-Site Scripting)

**Status: ✅ Majoritariamente Protegido | ⚠️ Verificar renderização**

React escapa HTML por padrão em JSX. O risco de XSS existe apenas se:
1. Algum componente usa `dangerouslySetInnerHTML`
2. Conteúdo é inserido via `innerHTML` em JavaScript puro

Dado que a aplicação usa Next.js com React, o escape automático protege em 99% dos casos.

**VAL-07 — Verificar uso de `dangerouslySetInnerHTML`:**
```bash
# Verificar se existe uso inseguro
grep -r "dangerouslySetInnerHTML" apps/web/src/
```

### 3.4 Command Injection

**Status: ✅ Protegido**

Não há chamadas a `exec()`, `spawn()`, ou comandos de shell com input do usuário.

### 3.5 Path Traversal

**Status: ✅ Protegido**

O upload de arquivo usa `file.arrayBuffer()` e processa na memória — não salva arquivos no filesystem com caminhos controlados pelo usuário.

### 3.6 SSRF (Server-Side Request Forgery)

**Status: ⚠️ Risco Potencial (ver VAL-04 e VAL-06)**

URLs de imagem aceitas sem allowlist de host poderiam ser usadas para SSRF se o servidor realizar fetch dessas URLs.

---

## 4. Análise de Upload de Arquivo

### Controles Implementados

| Controle | Status |
|---|---|
| Limite de tamanho (5MB) | ✅ |
| Validação de tipo (MIME + extensão) | ⚠️ Bypassável |
| Processamento na memória (sem filesystem) | ✅ |
| Limite de texto extraído (12000 chars) | ✅ |

### Controles Ausentes

| Controle | Status |
|---|---|
| Validação de conteúdo (magic bytes) | ❌ |
| Antivírus/malware scan | ❌ |
| Timeout de processamento de PDF | ❌ |
| Sandbox para parsing de PDF | ❌ |

**VAL-08 — Sem validação de magic bytes:**
O tipo real de um arquivo pode ser detectado pelos primeiros bytes:
- PDF: começa com `%PDF-`
- HTML: começa com `<!DOCTYPE html>` ou `<html`

```typescript
// Adicionar ao início do processamento:
const buffer = Buffer.from(await file.arrayBuffer())
const header = buffer.slice(0, 5).toString('ascii')
if (mime === 'application/pdf' || name.endsWith('.pdf')) {
  if (!header.startsWith('%PDF-')) {
    return NextResponse.json({ error: 'Arquivo não é um PDF válido' }, { status: 400 })
  }
}
```

---

## 5. Parâmetros de URL

Os parâmetros `[id]`, `[npcId]`, `[sessionId]`, `[appId]` etc. são UUIDs. O Prisma valida implicitamente que o valor corresponde ao tipo de ID esperado (se for um UUID v4 inválido, a query simplesmente não retorna resultados).

No entanto, não há validação explícita de formato UUID nos parâmetros:

```typescript
// Sem validação de formato:
params.id  // Poderia ser qualquer string

// Com Prisma, uma string não-UUID em where: { id: 'not-a-uuid' }
// simplesmente retorna null — não causa erro de SQL
```

**Risco:** Baixo (Prisma/PostgreSQL lida graciosamente), mas pode causar mensagens de erro confusas.

---

## 6. Dados do Bot Discord

O bot Discord processa inputs de comandos slash. O Discord valida tipos de parâmetros no servidor, então injeção de tipos é menos provável. No entanto, strings livres (como nomes de personagem, conteúdo de nota) devem ser validadas.

---

## 7. Recomendações

### Imediata (Crítica)

1. **Adicionar limite de tamanho em notas e handouts:**
```typescript
title: title?.trim().slice(0, 200) || null,
content: content.trim().slice(0, 50000),
```

2. **Validar estrutura de markersJson:**
Implementar `isValidMarkersJson()` análogo ao `isValidTokensJson()` existente.

3. **Limitar atributos da IA:**
```typescript
extracted.attributes = extracted.attributes.slice(0, 100)
```

### Alta Prioridade

4. **Adicionar allowlist de hosts para URLs de imagem:**
```typescript
const ALLOWED_HOSTS = new Set(['cdn.discordapp.com', 'res.cloudinary.com', 'i.imgur.com'])
const { hostname } = new URL(url)
if (!ALLOWED_HOSTS.has(hostname)) {
  return NextResponse.json({ error: 'Host não permitido' }, { status: 400 })
}
```

5. **Mover para Zod para validação centralizada:**
```typescript
import { z } from 'zod'

const noteSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(50000),
  visibility: z.enum(['PRIVATE', 'CAMPAIGN', 'GM_ONLY']).default('PRIVATE'),
})
```

### Média Prioridade

6. **Validar magic bytes em uploads de arquivo**

7. **Adicionar timeout em processamento de PDF:**
```typescript
const PARSE_TIMEOUT_MS = 10_000
const result = await Promise.race([
  parser.getText(),
  new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), PARSE_TIMEOUT_MS)),
])
```

---

## 8. Resumo

| Endpoint | Status Geral | Vulnerabilidades Principais |
|---|---|---|
| `/characters/import` | ⚠️ Médio | MIME bypass, validação da IA insuficiente |
| `/sessions/state` | ⚠️ Médio | markersJson sem estrutura, mapImageUrl sem allowlist |
| `/campaigns/[id]/rolls` | ✅ Bom | Nenhuma crítica |
| `/campaigns/[id]/apply` | ✅ Bom | Apenas rate limiting ausente |
| `/campaigns/[id]/notes` | ❌ Ruim | Sem limites de tamanho |
| `/campaigns/[id]/handouts` | ⚠️ Médio | imageUrl sem allowlist, sem limites |
| `/sessions/summary` | ✅ Bom | Nenhuma crítica |
