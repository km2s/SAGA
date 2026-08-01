# Revisão de Dependências — Saga RPG
**Data:** 2026-06-24  
**Versão:** 1.0

---

## 1. Inventário de Dependências

### 1.1 `apps/web` — Frontend + API Next.js

**Dependências de Produção:**

| Pacote | Versão Declarada | Propósito | Risco |
|---|---|---|---|
| `next` | `^14.2.4` | Framework web | ⚠️ Versão anterior |
| `next-auth` | `^4.24.7` | Autenticação OAuth | ⚠️ Versão anterior |
| `@anthropic-ai/sdk` | `^0.102.0` | Integração com Claude API | ✅ |
| `pdf-parse` | `^2.4.5` | Extração de texto de PDFs | ⚠️ Biblioteca de parse |
| `react` | `^18.3.1` | UI | ✅ |
| `react-dom` | `^18.3.1` | UI DOM | ✅ |
| `lucide-react` | `^1.17.0` | Ícones | ✅ |
| `database` | `workspace:*` | Prisma client (interno) | N/A |

**Dependências de Desenvolvimento:**

| Pacote | Versão | Propósito | Risco |
|---|---|---|---|
| `typescript` | `^5.4.5` | TypeScript | ✅ |
| `@types/node` | `^20.14.2` | Tipos Node.js | ✅ |
| `@types/react` | `^18.3.3` | Tipos React | ✅ |
| `@types/react-dom` | `^18.3.0` | Tipos React DOM | ✅ |
| `@types/pdf-parse` | `^1.1.5` | Tipos pdf-parse | ✅ |
| `tailwindcss` | `^3.4.4` | CSS framework | ✅ |
| `autoprefixer` | `^10.4.19` | CSS postprocess | ✅ |
| `postcss` | `^8.4.38` | CSS transform | ✅ |

---

### 1.2 `apps/bot` — Bot Discord

**Dependências de Produção:**

| Pacote | Versão Declarada | Propósito | Risco |
|---|---|---|---|
| `discord.js` | `^14.15.2` | Discord API client | ✅ |
| `dotenv` | `^16.4.5` | Variáveis de ambiente | ✅ |
| `database` | `workspace:*` | Prisma client (interno) | N/A |

**Dependências de Desenvolvimento:**

| Pacote | Versão | Propósito | Risco |
|---|---|---|---|
| `typescript` | `^5.4.5` | TypeScript | ✅ |
| `@types/node` | `^20.14.2` | Tipos Node.js | ✅ |
| `tsx` | `^4.15.1` | Execução TypeScript | ✅ |

---

### 1.3 `packages/database` — ORM Compartilhado

| Pacote | Versão Declarada | Propósito | Risco |
|---|---|---|---|
| `@prisma/client` | `^5.14.0` | ORM client | ✅ |
| `prisma` | `^5.14.0` (dev) | Migrations CLI | ✅ |

---

## 2. Análise de Risco por Pacote

### 2.1 `next` — Framework Web Principal

**Versão em uso:** `^14.2.4`  
**Versão LTS atual:** Next.js 14.x (com patches de segurança)  
**Versão mais nova:** 15.x  

**Vulnerabilidades conhecidas relevantes para Next.js 14:**

| CVE | Descrição | Versões afetadas | Status |
|---|---|---|---|
| CVE-2024-46982 | Cache Poisoning via crafted response | < 14.2.10 | ⚠️ Verificar |
| CVE-2024-34351 | SSRF via Host header | < 14.1.1 | ✅ Corrigido em 14.2.x |
| CVE-2025-29927 | Bypass de middleware via x-middleware-subrequest | < 15.2.3 / 14.2.25 | ⚠️ **CRÍTICO** |

> ⚠️ **ALERTA CRÍTICO:** CVE-2025-29927 é uma vulnerabilidade crítica que permite contornar o middleware de autenticação do Next.js via header `x-middleware-subrequest`. Dado que o Saga usa o middleware do NextAuth para proteger rotas (`/dashboard/*`, `/campaign/*`), esta vulnerabilidade pode permitir acesso não autenticado a todas as rotas protegidas.

**Ação recomendada:** Atualizar `next` para `14.2.25` ou superior **imediatamente**.

---

### 2.2 `next-auth` — Autenticação

**Versão em uso:** `^4.24.7`  
**Versão mais nova:** Auth.js v5 (breaking changes)  

**Status de segurança:**
- A versão 4.x está em modo de manutenção (sem novas features)
- Auth.js v5 é a versão moderna com melhor suporte a Next.js App Router
- Não há CVEs críticos conhecidos para a versão 4.24.x especificamente

**Risco:** O fato de estar em modo de manutenção significa que novas vulnerabilidades de segurança podem não receber patches. A migração para Auth.js v5 é recomendada a médio prazo.

---

### 2.3 `pdf-parse` — Parsing de PDFs

**Versão em uso:** `^2.4.5`  
**Propósito:** Extração de texto de fichas de personagem em PDF

**Análise de Risco:**
- `pdf-parse` é uma abstração sobre `pdfjs-dist` (Mozilla PDF.js)
- PDFs são um formato complexo com histórico de exploits (JavaScript embutido, scripts maliciosos)
- **A biblioteca foi auditada:** A versão 2.x desabilita o JavaScript embutido em PDFs por padrão
- O limite de 5MB mitiga ataques de recursos (OOM/CPU)

**Riscos residuais:**
- PDFs com estruturas malformadas podem causar erros de parsing não tratados
- O processamento ocorre síncrono sem timeout — um PDF projetado para demorar pode travar a thread

**Alternativas mais seguras:**
- `@mozilla/pdfjs-dist` com configuração explícita desabilitando scripts
- Processamento em worker thread com timeout

---

### 2.4 `@anthropic-ai/sdk` — Integração com IA

**Versão em uso:** `^0.102.0`  
**Status:** Pacote em desenvolvimento ativo pela Anthropic

**Riscos de Supply Chain:**
- Pacote oficial da Anthropic — baixo risco de compromisso
- Versões Major podem trazer breaking changes

**Risco de Negócio:** A API key da Anthropic é um ativo de alto valor. Se o SDK fosse comprometido (supply chain attack), poderia exfiltrar a chave.

---

### 2.5 `discord.js` — SDK do Discord

**Versão em uso:** `^14.15.2`  
**Status:** Versão estável e atualizada  

**Análise:** Discord.js é uma biblioteca amplamente usada e auditada pela comunidade. A versão 14.x suporta Discord API v10. Não há CVEs críticos conhecidos na versão atual.

---

### 2.6 `lucide-react` — Ícones

**Versão em uso:** `^1.17.0`  
**Análise:** Biblioteca de ícones SVG sem lógica de negócio. Risco mínimo.

---

## 3. Análise de Supply Chain

### 3.1 Lockfile

O projeto usa `pnpm-lock.yaml`, que:
- ✅ Trava versões exatas das dependências transitivas
- ✅ Garante reprodutibilidade de builds
- ⚠️ Não tem verificação de integridade automatizada em CI (sem CI/CD)

### 3.2 Verificação de Integridade

```bash
# Verificar se o lockfile está íntegro
pnpm install --frozen-lockfile

# Auditar vulnerabilidades conhecidas
pnpm audit
```

### 3.3 Pacotes com Acesso a Dados Sensíveis

| Pacote | Dado Sensível Acessível | Risco |
|---|---|---|
| `next-auth` | NEXTAUTH_SECRET, OAuth secrets | Alto |
| `@anthropic-ai/sdk` | ANTHROPIC_API_KEY | Alto |
| `@prisma/client` | DATABASE_URL, DIRECT_URL | Crítico |
| `discord.js` | DISCORD_TOKEN, CLIENT_SECRET | Alto |
| `pdf-parse` | Conteúdo de arquivos do usuário | Médio |

---

## 4. Verificação de Vulnerabilidades Conhecidas

### Executar Auditoria

```bash
# Verificar vulnerabilidades no workspace raiz
pnpm audit

# Verificar por workspace específico
pnpm --filter web audit
pnpm --filter bot audit
pnpm --filter database audit
```

### Vulnerabilidades Esperadas a Verificar

| Pacote | Potencial CVE | Ação |
|---|---|---|
| `next` | CVE-2025-29927 (middleware bypass) | **Atualizar urgente** |
| `next` | CVE-2024-46982 (cache poisoning) | Verificar versão exata |
| `pdf-parse` (via pdfjs-dist) | Potenciais CVEs em pdfjs-dist | Executar `pnpm audit` |

---

## 5. Dependências Ausentes (Recomendadas)

Para melhorar a segurança, as seguintes dependências são recomendadas:

| Pacote | Propósito | Prioridade |
|---|---|---|
| `zod` | Validação de schema tipada | Alta |
| `@upstash/ratelimit` | Rate limiting serverless | Alta |
| `@upstash/redis` | Backend para rate limiting | Alta |
| `helmet` | HTTP security headers | Média |
| `pino` | Logging estruturado | Média |

---

## 6. Recomendações

### Imediata (Crítica)

1. **Executar `pnpm audit` agora** e resolver todas as vulnerabilidades de severidade alta/crítica.

2. **Atualizar `next` para versão ≥ 14.2.25** para corrigir CVE-2025-29927 (middleware bypass crítico):
```bash
pnpm --filter web add next@^14.2.25
```

### Alta Prioridade

3. **Configurar verificação automatizada de vulnerabilidades:**
```yaml
# .github/workflows/security.yml (a criar)
- name: Security Audit
  run: pnpm audit --audit-level moderate
```

4. **Adicionar Dependabot ou Renovate** para PRs automáticos de atualização de dependências.

### Média Prioridade

5. **Adicionar Zod** para validação centralizada de schemas:
```bash
pnpm --filter web add zod
```

6. **Avaliar processamento de PDF em worker thread** para isolar possíveis exploits:
```typescript
import { Worker } from 'worker_threads'
// Processar PDF em worker com timeout
```

7. **Avaliar migração para Auth.js v5** (planejamento de médio prazo).

### Baixa Prioridade

8. **Verificar que `pnpm-lock.yaml` está commitado** e não modificado indevidamente.

9. **Adicionar `pnpm audit` como pre-commit hook** ou verificação de CI.

---

## 7. Resumo de Riscos

| Dependência | Risco | Ação |
|---|---|---|
| `next ^14.2.4` | Crítico — CVE-2025-29927 | Atualizar urgente |
| `next-auth ^4.24.7` | Médio — modo manutenção | Planejar migração Auth.js v5 |
| `pdf-parse ^2.4.5` | Médio — parsing de PDFs não confiáveis | Adicionar timeout, verificar audit |
| `@anthropic-ai/sdk` | Baixo | Manter atualizado |
| `discord.js ^14.15.2` | Baixo | Manter atualizado |
| Ausência de `zod` | Alto (risco de validação) | Adicionar |
| Ausência de rate limiting | Crítico | Adicionar `@upstash/ratelimit` |
| Ausência de CI/CD | Alto | Criar pipeline |
