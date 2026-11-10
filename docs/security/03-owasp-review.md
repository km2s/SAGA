# Revisão OWASP — Saga RPG
**Data:** 2026-06-24  
**Versão:** 1.0

---

## Parte 1 — OWASP Top 10 (2021)

---

### A01:2021 — Broken Access Control

**Status:** ⚠️ Parcialmente Implementado — Riscos Presentes

**Achados:**

✅ **Implementado corretamente:**
- Middleware do NextAuth protege rotas `/dashboard/*` e `/campaign/*`
- Verificação de sessão (`getServerSession`) em todos os endpoints de API
- RBAC GM/Player verificado em operações sensíveis
- Verificação de ownership em fichas de personagem
- Controle granular de visibilidade de NPC (`NPCVisibility`)

⚠️ **Riscos identificados:**

**A01-RISK-01:** O endpoint `GET /api/health` não requer autenticação, expondo metadados de infraestrutura.

**A01-RISK-02:** Não há validação de que o `campaignId` nos parâmetros de URL pertence à campanha do `sessionId` em endpoints aninhados como `/campaigns/[id]/sessions/[sessionId]/summary`. Um usuário poderia potencialmente usar um `campaignId` de uma campanha que é membro para acessar dados de `sessionId` de outra campanha.

**A01-RISK-03:** Em `/api/campaigns/[id]/notes` (GET), a documentação indica que existe leitura de notas, mas não foi verificado se o filtro de visibilidade (`PRIVATE` só para autor, `GM_ONLY` só para GM) está aplicado corretamente.

**Nível de Risco:** Alto  
**Recomendação:** Corrigir `/api/health`, verificar isolamento de dados em endpoints aninhados, auditar filtro de visibilidade de notas.

---

### A02:2021 — Cryptographic Failures

**Status:** ⚠️ Parcialmente Adequado

**Achados:**

✅ **Implementado corretamente:**
- Autenticação via OAuth (sem senhas armazenadas)
- NextAuth.js usa JWT assinado com `NEXTAUTH_SECRET`
- Comunicação via HTTPS (Vercel)
- Nenhuma senha em texto plano no banco

⚠️ **Riscos identificados:**

**A02-RISK-01:** Não há `Strict-Transport-Security (HSTS)` configurado. Se acessado via HTTP, os tokens JWT circulam em texto plano.

**A02-RISK-02:** Não há `Cache-Control: no-store` em respostas de API que contêm dados sensíveis (fichas, notas). Proxies ou browsers podem cachear essas respostas.

**A02-RISK-03:** O `NEXTAUTH_SECRET` não tem validação de comprimento mínimo. Se for fraco (ex: "secret"), os JWTs podem ser vulneráveis a ataques de força bruta.

**Nível de Risco:** Médio  
**Recomendação:** Adicionar HSTS, Cache-Control em APIs sensíveis, validar entropia do NEXTAUTH_SECRET.

---

### A03:2021 — Injection

**Status:** ✅ Majoritariamente Protegido (SQL Injection) | ⚠️ Risco em Prompt Injection

**Achados:**

✅ **Protegido contra SQL Injection:**
- Todas as queries usam Prisma ORM com queries parametrizadas
- Nenhum uso de `$queryRawUnsafe` ou concatenação de SQL
- Única exceção: `prisma.$queryRaw\`SELECT 1\`` no health check (seguro por ser literal)

⚠️ **Prompt Injection:**
- O endpoint `/api/characters/import` concatena conteúdo controlado pelo usuário diretamente no prompt enviado ao Claude Haiku
- Não há separação semântica entre instrução (system) e dados (user)
- Não há sanitização do conteúdo do arquivo antes de enviá-lo à IA

**Evidência de Prompt Injection:**
```typescript
// apps/web/src/app/api/characters/import/route.ts:110-114
messages: [
  { role: 'user', content: `${EXTRACT_PROMPT}\n\n---\n${rawText}` }
  //                        ^instrução        ^dados do usuário
  // Ambos no mesmo campo 'user' — sem isolamento semântico
]
```

**Nível de Risco:** Alto (Prompt Injection) / Baixo (SQL Injection)  
**Recomendação:** Mover `EXTRACT_PROMPT` para campo `system` da API da Anthropic.

---

### A04:2021 — Insecure Design

**Status:** ⚠️ Riscos de Design Presentes

**Achados:**

**A04-RISK-01:** Ausência de Rate Limiting — O sistema foi projetado sem throttling, deixando endpoints de alto custo (Anthropic API) e alto volume (rolagens, presença) sem proteção.

**A04-RISK-02:** Modelo de Confiança em Dados do Discord — O sistema confia totalmente no perfil retornado pelo Discord OAuth para criar/atualizar usuários, sem verificação adicional. Se o Discord OAuth for comprometido, contas internas podem ser manipuladas.

**A04-RISK-03:** `markersJson` aceito de qualquer membro — O design permite que qualquer membro da campanha escreva dados arbitrários no campo `markersJson` (pings/marcadores) sem validação de estrutura.

**A04-RISK-04:** Re-aplicação spam — A lógica de `upsert` na inscrição foi projetada para re-aplicação, mas sem debounce, permite spam de notificações ao GM.

**Nível de Risco:** Alto  
**Recomendação:** Revisão de design para incluir rate limiting, validação de estrutura JSON, e debounce em notificações.

---

### A05:2021 — Security Misconfiguration

**Status:** ⚠️ Configurações Ausentes

**Achados:**

**A05-RISK-01:** Ausência de `Content-Security-Policy` — O header mais importante para prevenir XSS não está configurado.

**A05-RISK-02:** `X-XSS-Protection: 1; mode=block` — Header obsoleto que pode causar problemas em alguns browsers. Deve ser substituído por CSP.

**A05-RISK-03:** Sem HSTS — Nenhum `Strict-Transport-Security` configurado.

**A05-RISK-04:** Sem `Cross-Origin-Resource-Policy` ou `Cross-Origin-Opener-Policy` — Headers modernos de isolamento de origem ausentes.

**A05-RISK-05:** `vercel.json` não define configurações adicionais de segurança.

**Headers de Segurança Presentes:**
```
✅ X-Content-Type-Options: nosniff
✅ X-Frame-Options: SAMEORIGIN
⚠️ X-XSS-Protection: 1; mode=block (obsoleto)
✅ Referrer-Policy: strict-origin-when-cross-origin
✅ Permissions-Policy: camera=(), microphone=(), geolocation=()
❌ Content-Security-Policy (ausente)
❌ Strict-Transport-Security (ausente)
❌ Cross-Origin-Resource-Policy (ausente)
```

**Nível de Risco:** Alto  
**Recomendação:** Adicionar CSP, HSTS, CORP, COOP. Remover X-XSS-Protection obsoleto.

---

### A06:2021 — Vulnerable and Outdated Components

**Status:** ⚠️ Componentes Desatualizados

**Achados:**

| Pacote | Versão Usada | Última Estável | Status |
|---|---|---|---|
| `next` | ^14.2.4 | 15.x | ⚠️ Versão anterior disponível |
| `next-auth` | ^4.24.7 | 5.x (Auth.js) | ⚠️ Versão maior disponível |
| `@anthropic-ai/sdk` | ^0.102.0 | 0.x atual | ✅ Recente |
| `discord.js` | ^14.15.2 | 14.x | ✅ Atualizado |
| `pdf-parse` | ^2.4.5 | 2.x | ✅ OK |
| `prisma` | ^5.14.0 | 5.x | ✅ Atualizado |
| `react` | ^18.3.1 | 18.x | ✅ Atualizado |

**Risco da `pdf-parse`:** A biblioteca `pdf-parse` usa `pdfjs-dist` internamente que pode ter vulnerabilidades de parsing em PDFs malformados. O limite de 5MB atenua parcialmente.

**Nível de Risco:** Médio  
**Recomendação:** Avaliar migração para Next.js 15 e Auth.js v5. Executar `pnpm audit` regularmente.

---

### A07:2021 — Identification and Authentication Failures

**Status:** ✅ Majoritariamente Adequado

**Achados:**

✅ **Implementado corretamente:**
- Autenticação exclusivamente via Discord OAuth (sem senhas)
- JWT com assinatura criptográfica (`NEXTAUTH_SECRET`)
- Nenhum armazenamento de senha
- Sessões JWT (sem armazenamento server-side)

⚠️ **Riscos identificados:**

**A07-RISK-01:** Sem expiração explícita de sessão configurada no `authOptions`. O NextAuth.js usa padrão de 30 dias, que pode ser longo demais para uma plataforma de RPG.

**A07-RISK-02:** Sem validação de força do `NEXTAUTH_SECRET`. Uma secret fraca (gerada manualmente) tornaria os JWTs vulneráveis.

**A07-RISK-03:** Sem MFA — Depende do MFA do Discord (se o usuário tiver ativado na conta Discord).

**Nível de Risco:** Médio  
**Recomendação:** Configurar `maxAge` explícito (ex: 7 dias), documentar requisito de `NEXTAUTH_SECRET` com pelo menos 32 caracteres aleatórios.

---

### A08:2021 — Software and Data Integrity Failures

**Status:** ⚠️ Risco Presente

**Achados:**

**A08-RISK-01:** Ausência de `pnpm-lock.yaml` verificado em CI — Não há CI/CD, então o lockfile pode ser modificado localmente sem validação automatizada.

**A08-RISK-02:** O JSON retornado pelo Claude Haiku é processado com `JSON.parse()` sem validação profunda de tipos e valores. Um output manipulado (via prompt injection) poderia inserir dados malformados no sistema.

**A08-RISK-03:** `tokensJson` e `markersJson` são armazenados como strings JSON no banco — sem validação de tipo, um dado malicioso pode ser persistido e servido a outros clientes.

**Nível de Risco:** Médio  
**Recomendação:** Implementar schema de validação (Zod) para todos os dados JSON persistidos.

---

### A09:2021 — Security Logging and Monitoring Failures

**Status:** ❌ Crítico — Ausente

**Achados:**

Não existe **nenhum** logging de eventos de segurança na aplicação:

- ❌ Nenhum log de tentativas de acesso não autorizado (401, 403)
- ❌ Nenhum log de falhas de autenticação
- ❌ Nenhum log de operações sensíveis (deletar campanha, aprovar inscrição)
- ❌ Nenhum log de chamadas à API externa (Anthropic, Discord)
- ❌ Nenhuma auditoria de modificações de dados críticos
- ❌ Sem alertas de anomalias (picos de requisições, falhas repetidas)

**Nível de Risco:** Alto  
**Recomendação:** Implementar logging estruturado (ex: via Vercel Logs, Sentry, ou Pino) com eventos de segurança mínimos.

---

### A10:2021 — Server-Side Request Forgery (SSRF)

**Status:** ⚠️ Risco Potencial

**Achados:**

**A10-RISK-01:** Os campos `mapImageUrl` e `imageUrl` (handouts) aceitam qualquer URL com protocolo `http://` ou `https://`, incluindo:
- `http://169.254.169.254/latest/meta-data/` (AWS/GCP metadata)
- `http://localhost:5432/` (serviços locais)
- `http://10.0.0.1/admin` (serviços internos)

O risco depende de se o Next.js faz fetch dessas URLs server-side (ex: para o componente `<Image>` com `src` dinâmico ou para proxiar/validar a URL). Em Next.js, o componente `<Image>` com `remotePatterns` definido **não** faz fetch de hosts não listados — o que é uma proteção parcial.

No entanto, se algum código server-side realizar `fetch(mapImageUrl)`, o SSRF é completo.

**Nível de Risco:** Médio (depende de implementação no cliente)  
**Recomendação:** Implementar allowlist de hosts para todas as URLs de imagem aceitas.

---

## Parte 2 — OWASP API Security Top 10 (2023)

---

### API1:2023 — Broken Object Level Authorization (BOLA)

**Status:** ✅ Majoritariamente Implementado

**Achados:**
- Verificação de membership implementada na maioria dos endpoints
- Verificação de ownership em fichas de personagem

⚠️ **Risco:** Endpoints aninhados (ex: `/campaigns/[id]/sessions/[sessionId]`) podem não validar que `sessionId` pertence ao `id` da campanha, permitindo acesso cross-campaign.

---

### API2:2023 — Broken Authentication

**Status:** ✅ Implementado  
Autenticação OAuth robusta via NextAuth.js.

---

### API3:2023 — Broken Object Property Level Authorization

**Status:** ⚠️ Risco Presente

Em endpoints de atualização (`PATCH`), a lógica valida quais campos um usuário pode alterar, mas a granularidade pode ser insuficiente. Ex: em `sessions/state`, um player pode atualizar `markersJson` sem restrição de estrutura.

---

### API4:2023 — Unrestricted Resource Consumption

**Status:** ❌ Ausente

Nenhum dos endpoints implementa:
- Rate limiting por IP ou usuário
- Limites de tamanho de payload em JSON (apenas em upload de arquivo)
- Throttling de chamadas à API externa

---

### API5:2023 — Broken Function Level Authorization

**Status:** ✅ Implementado

Endpoints de função de GM verificam `isGM` explicitamente. O padrão é consistente e verificado em múltiplos endpoints.

---

### API6:2023 — Unrestricted Access to Sensitive Business Flows

**Status:** ⚠️ Risco Presente

- Import de fichas (custo financeiro) sem throttling
- Re-aplicação em campanhas (spam de DMs) sem debounce
- Presença/heartbeat sem rate limiting

---

### API7:2023 — Server Side Request Forgery

**Status:** ⚠️ Ver A10 acima

---

### API8:2023 — Security Misconfiguration

**Status:** ⚠️ Ver A05 acima

---

### API9:2023 — Improper Inventory Management

**Status:** ⚠️ Risco Presente

Não há documentação de API (OpenAPI/Swagger), o que dificulta auditoria e controle de quais endpoints existem. Endpoints legados podem permanecer sem monitoramento.

---

### API10:2023 — Unsafe Consumption of APIs

**Status:** ⚠️ Risco Presente

A resposta JSON do Claude Haiku é processada com confiança excessiva:
```typescript
extracted = JSON.parse(content.text) as typeof extracted
// Sem validação profunda de tipos, limites de tamanho, etc.
```

---

## Parte 3 — OWASP ASVS (Seleção de Controles Críticos)

| Controle ASVS | Nível | Status | Observação |
|---|---|---|---|
| V1.1 — Secure Software Development | 1 | ❌ | Sem SDL formal, sem CI/CD |
| V2.1 — Password Security | 1 | N/A | Sem senhas — OAuth only |
| V2.2 — General Authenticator Security | 1 | ⚠️ | JWT sem expiração explícita |
| V3.2 — Session Binding | 1 | ✅ | Cookies HttpOnly via NextAuth |
| V3.3 — Session Logout | 2 | ✅ | NextAuth implementa logout |
| V4.1 — General Access Control | 1 | ✅ | RBAC implementado |
| V4.2 — Operation Level Access Control | 1 | ⚠️ | Verificar notas e endpoints aninhados |
| V5.1 — Input Validation | 1 | ⚠️ | Manual, sem schema formal (Zod) |
| V5.3 — Output Encoding | 1 | ✅ | React escapa por padrão |
| V7.1 — Log Content | 1 | ❌ | Sem logging de segurança |
| V7.2 — Log Processing | 2 | ❌ | Sem sistema de logging |
| V8.2 — Client-Side Data Protection | 1 | ⚠️ | Sem Cache-Control em APIs |
| V9.1 — Communications Security | 1 | ⚠️ | Sem HSTS |
| V11.1 — Business Logic Security | 1 | ⚠️ | Rate limiting ausente |
| V12.1 — File Upload Security | 1 | ⚠️ | MIME validation por nome/tipo |
| V13.1 — API Security | 1 | ⚠️ | Sem documentação, sem rate limiting |
| V14.4 — HTTP Security Headers | 1 | ⚠️ | CSP e HSTS ausentes |

---

## Resumo OWASP

| Categoria | Risco | Prioridade |
|---|---|---|
| A01 Broken Access Control | Médio | Alta |
| A02 Crypto Failures | Médio | Média |
| A03 Injection (Prompt) | Alto | Alta |
| A04 Insecure Design | Alto | Crítica |
| A05 Misconfiguration (CSP/HSTS) | Alto | Crítica |
| A06 Outdated Components | Médio | Média |
| A07 Auth Failures | Baixo | Baixa |
| A08 Integrity Failures | Médio | Média |
| A09 Logging Failures | Alto | Alta |
| A10 SSRF | Médio | Média |
