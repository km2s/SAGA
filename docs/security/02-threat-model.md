# Modelagem de Ameaças — Saga RPG
**Data:** 2026-06-24  
**Metodologia:** STRIDE  
**Versão:** 1.0

---

## 1. Visão Geral do Sistema

O Saga RPG é uma plataforma web + bot Discord para gestão de campanhas de RPG. O sistema tem três componentes principais que interagem entre si e com serviços externos.

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET (UNTRUSTED)                      │
│                                                                  │
│   ┌──────────┐      ┌────────────────┐      ┌───────────────┐   │
│   │ Browser  │─────▶│  Next.js Web   │─────▶│ Discord OAuth │   │
│   │ (User)   │◀─────│  (Vercel)      │      └───────────────┘   │
│   └──────────┘      │                │                          │
│                      │   API Routes   │─────▶┌───────────────┐   │
│                      │                │      │  Anthropic    │   │
│   ┌──────────┐      └───────┬────────┘      │  Claude API   │   │
│   │ Discord  │              │               └───────────────┘   │
│   │  Server  │◀─────────────┼──────────────▶┌───────────────┐   │
│   │          │              │               │  Cloudinary   │   │
│   └──────────┘              │               └───────────────┘   │
│                              │                                   │
│   ┌──────────┐              ▼                                   │
│   │  Bot     │─────────▶┌──────────────────────────────────┐   │
│   │ Discord  │           │   PostgreSQL (Supabase)          │   │
│   │ (Node)   │◀──────────│   packages/database (Prisma)     │   │
│   └──────────┘           └──────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Ativos

| Ativo | Descrição | Classificação |
|---|---|---|
| Tokens JWT de sessão | Credenciais de acesso do usuário | Crítico |
| `DISCORD_CLIENT_SECRET` | Secret OAuth do Discord | Crítico |
| `NEXTAUTH_SECRET` | Chave de assinatura JWT | Crítico |
| `DATABASE_URL` / `DIRECT_URL` | Credenciais do banco de dados | Crítico |
| `ANTHROPIC_API_KEY` | Chave de API da Anthropic | Alto |
| `DISCORD_TOKEN` | Token do bot Discord | Alto |
| `CLOUDINARY_API_SECRET` | Credenciais de upload de mídia | Alto |
| Fichas de personagem | Dados criados pelos jogadores | Médio |
| Notas privadas (PRIVATE/GM_ONLY) | Conteúdo confidencial de campanha | Médio |
| Dados pessoais (discordId, username) | Informação de identificação de usuário | Médio |
| Histórico de rolagens | Log de atividades de sessão | Baixo |
| Handouts | Conteúdo compartilhado de campanha | Baixo |

---

## 3. Fronteiras de Confiança

### Fronteira 1: Internet → Aplicação Web
- **Entidade:** Usuário não autenticado (navegador)
- **Nível de confiança:** Zero (não confiável)
- **Controles:** NextAuth.js middleware, verificação de sessão em API routes

### Fronteira 2: Aplicação Web → Banco de Dados (Supabase)
- **Entidade:** Next.js server-side + Bot Discord
- **Nível de confiança:** Total (credenciais de serviço)
- **Controles:** Prisma ORM (queries parametrizadas), variáveis de ambiente

### Fronteira 3: Aplicação Web → Serviços Externos
- **Entidade:** Discord OAuth, Anthropic API, Cloudinary
- **Nível de confiança:** Confiável mas externo
- **Controles:** Chaves de API, HTTPS, validação de resposta

### Fronteira 4: Discord → Bot
- **Entidade:** Eventos do Discord (comandos slash, interações)
- **Nível de confiança:** Parcialmente confiável (Discord valida eventos)
- **Controles:** Verificação de guild, verificação de papel GM

### Fronteira 5: Usuário Autenticado → Dados de Outros Usuários
- **Entidade:** Jogador ou GM autenticado
- **Nível de confiança:** Confiável apenas para seus próprios dados
- **Controles:** RBAC (GM/Player), ownership checks

---

## 4. Superfície de Ataque

| Superfície | Entrada | Autenticado |
|---|---|---|
| `POST /api/auth/[...nextauth]` | Login OAuth | Não |
| `GET /api/health` | Health check | Não ⚠️ |
| `GET /api/campaigns/open` | Lista campanhas abertas | Sim |
| `POST /api/campaigns/[id]/apply` | Inscrição em campanha | Sim |
| `POST /api/characters/import` | Upload PDF/HTML | Sim |
| `PATCH /api/campaigns/[id]/sessions/state` | Estado da mesa virtual | Sim |
| `POST /api/campaigns/[id]/rolls` | Rolagem de dados + chat | Sim |
| `POST /api/campaigns/[id]/notes` | Criação de notas | Sim |
| `POST /api/campaigns/[id]/handouts` | Compartilhar handouts | Sim (GM) |
| Bot Discord (comandos slash) | Interações Discord | Via Discord |

---

## 5. Fluxos de Dados Críticos

### Fluxo A: Autenticação Discord OAuth
```
Usuário → [Login] → Discord OAuth → callback → NextAuth.js
  → JWT gerado → upsert User no banco → sessão estabelecida
```
**Dados em trânsito:** discordId, username, avatar URL  
**Risco:** Fixação de sessão, callback poisoning

### Fluxo B: Upload de Ficha de Personagem
```
Usuário → [PDF/HTML] → /api/characters/import
  → Leitura de arquivo (pdf-parse) → extractFromHtml()
  → rawText → Anthropic Claude API
  → JSON extraído → response ao cliente
```
**Dados em trânsito:** Conteúdo da ficha (possivelmente PII)  
**Risco:** Prompt injection, exfiltração via IA, custo financeiro

### Fluxo C: Mesa Virtual (Tokens)
```
GM/Player → [tokensJson] → /api/campaigns/[id]/sessions/state
  → Verificação de membro → Verificação de permissão live
  → Merge de tokens → atualização no banco
  → Polling por outros clientes
```
**Dados em trânsito:** Estado da mesa virtual (posições de tokens, mapa)  
**Risco:** Token manipulation, data injection

### Fluxo D: Notificação Discord
```
Evento (inscrição) → discord-notify.ts → Discord REST API
  → DM para usuário
```
**Dados em trânsito:** discordId do GM/jogador  
**Risco:** Spam de DMs, rate limiting do Discord

---

## 6. Ameaças STRIDE

### 6.1 Spoofing (Falsificação de Identidade)

| # | Ameaça | Componente | Impacto | Risco | Mitigação |
|---|---|---|---|---|---|
| S-01 | Roubo de token JWT via XSS | Tokens de sessão no localStorage ou cookies | Sequestro de sessão | Alto | Cookies HttpOnly + Secure + SameSite=Strict |
| S-02 | Manipulação do perfil Discord OAuth | Callback do NextAuth | Impersonação de usuário | Médio | Validar `profile.id` e comparar com token existente |
| S-03 | Falsificação de `discordId` no token | JWT customizado | Acesso como outro usuário | Baixo | NEXTAUTH_SECRET protege assinatura do JWT |

**Mitigação S-01 (crítica):**  
Verificar se os cookies do NextAuth estão com `HttpOnly`, `Secure` e `SameSite=Strict`. O NextAuth por padrão define isso em produção, mas deve ser verificado.

---

### 6.2 Tampering (Adulteração)

| # | Ameaça | Componente | Impacto | Risco | Mitigação |
|---|---|---|---|---|---|
| T-01 | Adulteração de tokensJson por jogador | Endpoint `/sessions/state` | Manipulação da mesa virtual | Alto | Implementado (merge parcial GM-only fields) — mas validação estrutural limitada |
| T-02 | Injeção de dados via markersJson | Endpoint `/sessions/state` | Dados arbitrários no banco | Alto | Ausente — qualquer membro pode injetar qualquer JSON |
| T-03 | Modificação de ficha de outro jogador | Endpoints `/characters/[id]` | Dados corrompidos | Médio | Verificação de ownership + GM implementada |
| T-04 | Re-aplicação para resetar status | Endpoint `/campaigns/[id]/apply` | Spam de notificações ao GM | Médio | Upsert reseta status sem debounce |
| T-05 | Adulteração de resumo de sessão | Endpoint `[sessionId]/summary` | Dados falsos no histórico | Baixo | Apenas GM pode escrever |

---

### 6.3 Repudiation (Repúdio)

| # | Ameaça | Componente | Impacto | Risco | Mitigação |
|---|---|---|---|---|---|
| R-01 | GM nega ter aprovado inscrição | Sistema de inscrições | Disputas de usuário | Médio | Não há timestamp de aprovação no log |
| R-02 | Jogador nega ter feito rolagem | `RollLog` | Disputas de jogo | Baixo | `rolledBy` registra username mas não é imutável |
| R-03 | Ações sem auditoria (admin) | Ausência de logging | Impossível investigar incidentes | Alto | Sem logging de segurança implementado |

---

### 6.4 Information Disclosure (Divulgação de Informação)

| # | Ameaça | Componente | Impacto | Risco | Mitigação |
|---|---|---|---|---|---|
| I-01 | Hostname do banco exposto | `GET /api/health` | Reconhecimento de infraestrutura | Crítico | Endpoint sem autenticação |
| I-02 | Mensagens de erro do Prisma expostas | `GET /api/health` | Detalhes internos vazados | Crítico | dbError retornado ao cliente |
| I-03 | Notas GM_ONLY acessíveis por players | `GET /api/campaigns/[id]/notes` | Spoilers, meta-informação | Alto | Verificar se filtro de visibilidade está implementado |
| I-04 | NPC privado visível via enumeração | `GET /api/campaigns/[id]/npcs/[npcId]` | Spoilers de campanha | Médio | Implementado com canView check |
| I-05 | Conteúdo de ficha enviado à Anthropic | Import de fichas | Dados do usuário processados externamente | Médio | Dados do usuário saem do controle após envio |
| I-06 | discordId em payloads de API | Vários endpoints | Enumeração de usuários | Baixo | discordId é público no Discord |

---

### 6.5 Denial of Service (Negação de Serviço)

| # | Ameaça | Componente | Impacto | Risco | Mitigação |
|---|---|---|---|---|---|
| D-01 | Abuso de API Anthropic (custo) | `/api/characters/import` | Custo financeiro ilimitado | Crítico | Sem rate limiting |
| D-02 | Flood de banco via rolagens | `POST /api/campaigns/[id]/rolls` | Saturação do banco | Alto | Sem rate limiting |
| D-03 | Upload de arquivo grande | `/api/characters/import` | Exaustão de memória | Médio | Limite de 5MB implementado |
| D-04 | Query sem paginação | `GET /api/campaigns/open` | Timeout em produção com dados reais | Médio | Sem take/skip |
| D-05 | Spam de presença heartbeat | `POST /api/campaigns/[id]/presence` | Flood de escritas no banco | Médio | Sem rate limiting |

---

### 6.6 Elevation of Privilege (Escalonamento de Privilégios)

| # | Ameaça | Componente | Impacto | Risco | Mitigação |
|---|---|---|---|---|---|
| E-01 | Player executar ação de GM via API direta | Endpoints GM-only | Controle indevido de campanha | Alto | Verificação `isGM` implementada na maioria dos endpoints |
| E-02 | Usuário não-membro acessar recursos de campanha | Todos endpoints `/campaigns/[id]/` | Vazamento de dados | Alto | Verificação de membership implementada |
| E-03 | Jogador sincronizar tokens sem permissão live | `/sessions/state` | Manipulação de mesa virtual | Médio | `liveMembersJson` check implementado |
| E-04 | Aprovação de própria inscrição | `/applications/[appId]` | Acesso indevido a campanha | Baixo | GM verifica, mas o GM poderia ser o próprio aplicante? |

---

## 7. Ameaças por Ator

### Ator: Usuário Anônimo (Não Autenticado)
- **Objetivo:** Reconhecimento, DoS, acesso não autorizado
- **Capacidade:** Requisições HTTP diretas
- **Ameaças:** I-01, I-02, D-03, S-03

### Ator: Jogador Autenticado (PLAYER)
- **Objetivo:** Escalar privilégios, acessar dados de outros, spam
- **Capacidade:** Todas as chamadas de API autenticadas
- **Ameaças:** E-01, E-02, T-01, T-02, D-01, D-02, D-05, T-04

### Ator: GM da Campanha
- **Objetivo:** Abusar do papel GM, comprometer campanhas de outros GMs
- **Capacidade:** Todas as ações de GM na própria campanha
- **Ameaças:** I-03 (notas privadas de outras campanhas), T-05

### Ator: Atacante Externo
- **Objetivo:** Comprometer infraestrutura, roubar dados
- **Capacidade:** Automação, exploração de vulnerabilidades
- **Ameaças:** I-01, D-01, S-01, A-02 (prompt injection)

### Ator: Insider (Desenvolvedor com acesso ao .env)
- **Objetivo:** Exfiltração de dados
- **Capacidade:** Acesso direto ao banco, todas as APIs
- **Ameaças:** Todos os ativos críticos

---

## 8. Matriz de Risco

| Ameaça | Probabilidade | Impacto | Risco Resultante |
|---|---|---|---|
| D-01 (custo Anthropic) | Alta | Crítico | **Crítico** |
| I-01 (health sem auth) | Alta | Alto | **Crítico** |
| T-02 (markersJson injection) | Média | Alto | **Alto** |
| E-02 (não-membro acessa campanha) | Baixa | Alto | **Médio** |
| S-01 (roubo de JWT via XSS) | Baixa | Crítico | **Alto** |
| I-02 (erros DB expostos) | Alta | Médio | **Alto** |

---

## 9. Casos de Uso Abusivos

### Caso 1: Extorsão por Custo de API
Um usuário mal-intencionado autentica-se com uma conta Discord, e em seguida faz centenas de requisições ao endpoint `/api/characters/import` com arquivos HTML/PDF válidos. Cada requisição gera uma chamada paga ao Claude Haiku. O proprietário da aplicação recebe uma fatura inesperada da Anthropic.

**Prevenção:** Rate limiting por usuário (ex: 5 imports/hora) + alerta de custo na Anthropic.

### Caso 2: Sabotagem de Mesa Virtual
Um jogador com permissão `live` na mesa virtual envia `tokensJson` com estrutura manipulada que sobrescreve atributos de outros tokens (HP, visibilidade, label). O merge implementado protege campos `GM-only` do token existente, mas não impede a substituição por um token completamente novo com o mesmo `id`.

**Prevenção:** Validar que o jogador só pode mover tokens que lhe pertencem (campo `ownerId`).

### Caso 3: Reconhecimento via Health Check
Um atacante acessa `GET /api/health` sem autenticação e descobre o hostname do banco de dados Supabase. Com esse conhecimento, pode pesquisar vulnerabilidades específicas da versão do Supabase/PostgreSQL em uso.

**Prevenção:** Remover informações de infraestrutura do endpoint ou adicionar autenticação.
