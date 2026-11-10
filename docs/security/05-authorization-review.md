# Revisão de Autorização — Saga RPG
**Data:** 2026-06-24  
**Versão:** 1.0

---

## 1. Modelo de Autorização

O Saga RPG implementa **RBAC (Role-Based Access Control)** com dois papéis principais:

| Papel | Descrição | Tabela |
|---|---|---|
| `GM` | Mestre da campanha — controle total | `CampaignMember.role = 'GM'` |
| `PLAYER` | Jogador — acesso limitado aos próprios dados | `CampaignMember.role = 'PLAYER'` |

Adicionalmente, existe controle granular por **visibilidade de NPC** (`NPCVisibility`) e por **visibilidade de nota** (`Note.visibility`).

---

## 2. Matriz de Controle de Acesso

### 2.1 Campanhas

| Ação | Não Membro | Player | GM | Não Auth |
|---|---|---|---|---|
| Listar campanhas abertas | ❌ | ✅ | ✅ | ❌ |
| Ver detalhes da campanha | ❌ | ✅ | ✅ | ❌ |
| Editar metadados da campanha | ❌ | ❌ | ✅ | ❌ |
| Criar campanha | N/A | N/A | N/A → ✅ | ❌ |
| Entrar na campanha (join) | ✅ | N/A | N/A | ❌ |
| Inscrever-se (apply) | ✅ | N/A | N/A | ❌ |

### 2.2 Fichas de Personagem

| Ação | Não Membro | Player (própria) | Player (outra) | GM |
|---|---|---|---|---|
| Ver ficha | ❌ | ✅ | ⚠️ ver nota | ✅ |
| Editar ficha | ❌ | ✅ | ❌ | ✅ |
| Deletar ficha | ❌ | ✅ | ❌ | ✅ |
| Importar ficha | N/A | ✅ | N/A | ✅ |

> ⚠️ **Nota:** A lógica de "Player ver ficha pública de outro player" depende do campo `isPublic` e precisa ser verificada em cada endpoint.

### 2.3 NPCs

| Ação | Não Membro | Player | GM |
|---|---|---|---|
| Listar NPCs | ❌ | ✅ (filtrado) | ✅ (tudo) |
| Ver NPC | ❌ | ✅ (se isPublic ou canView) | ✅ |
| Criar NPC | ❌ | ❌ | ✅ |
| Editar NPC | ❌ | ❌ | ✅ |
| Deletar NPC | ❌ | ❌ | ✅ |
| Gerenciar visibilidade | ❌ | ❌ | ✅ |

### 2.4 Sessões e Mesa Virtual

| Ação | Não Membro | Player | GM |
|---|---|---|---|
| Iniciar sessão | ❌ | ❌ | ✅ |
| Encerrar sessão | ❌ | ❌ | ✅ |
| Sincronizar tokens | ❌ | ✅ (se live) | ✅ |
| Controlar música | ❌ | ❌ | ✅ |
| Definir mapa | ❌ | ❌ | ✅ |
| Pings/marcadores | ❌ | ✅ | ✅ |
| Ver estado da sessão | ❌ | ✅ | ✅ |

### 2.5 Notas

| Visibilidade | Autor | Outros Players | GM |
|---|---|---|---|
| `PRIVATE` | ✅ | ❌ | ❌ |
| `CAMPAIGN` | ✅ | ✅ | ✅ |
| `GM_ONLY` | ✅ (se GM) | ❌ | ✅ |

### 2.6 Handouts

| Ação | Player | GM |
|---|---|---|
| Criar handout | ❌ | ✅ |
| Ver handouts | ✅ | ✅ |
| Deletar handout | ❌ | ✅ |

---

## 3. Análise de Endpoints por Risco

### 3.1 Endpoints Verificados Corretamente

**`POST /api/campaigns/[id]/npcs`** — Criação de NPC:
```typescript
// Verifica: sessão → membro → isGM ✅
const member = await prisma.campaignMember.findFirst({
  where: { campaignId: params.id, user: { discordId: session.user.discordId } }
})
if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })
const isGM = member.role === 'GM'
if (!isGM) return NextResponse.json({ error: 'GM only' }, { status: 403 })
```

**`PATCH /api/campaigns/[id]/sessions/state`** — Sincronização de tokens:
```typescript
// Verifica: sessão → membro → permissão live (para não-GM) ✅
if (!isGM) {
  const currentLive = activeSession.liveMembersJson
    ? JSON.parse(activeSession.liveMembersJson) as string[]
    : []
  if (!currentLive.includes(member.id)) {
    return NextResponse.json({ error: 'Sem permissão para sincronizar ao vivo' }, { status: 403 })
  }
}
```

**`GET /api/campaigns/[id]/npcs/[npcId]`** — Visibilidade de NPC:
```typescript
// Verifica: sessão → membro → isPublic || GM || canView ✅
const canView = isGM || npc.isPublic ||
  npc.visibilities.some(v => v.memberId === member.id && v.canView)
```

---

### 3.2 Riscos de Autorização Identificados

#### AUTHZ-01 — Isolamento de Dados em Endpoints Aninhados

**Severidade:** Alta  
**Arquivo:** `apps/web/src/app/api/campaigns/[id]/sessions/[sessionId]/summary/route.ts`

O endpoint valida que o usuário é GM da campanha `[id]`, mas não verifica se o `[sessionId]` pertence à campanha `[id]`:

```typescript
// Verifica GM da campanha ✅
const membership = await prisma.campaignMember.findFirst({
  where: { campaignId: params.id, user: { discordId: session.user.discordId }, role: 'GM' },
})

// Busca sessão por ID apenas ⚠️
const sessionRecord = await prisma.session.findFirst({
  where: { id: params.sessionId, campaignId: params.id }, // ✅ campaignId incluso — OK
})
```

Neste caso específico, `campaignId: params.id` está na query, então o risco é mitigado. **Verificar todos os outros endpoints aninhados.**

#### AUTHZ-02 — Visibilidade de Notas Não Verificada

**Severidade:** Alta  
**Arquivo:** `apps/web/src/app/api/campaigns/[id]/notes/route.ts`

O endpoint POST de criação verifica papéis corretamente, mas **não há evidência de um endpoint GET de listagem de notas com filtro de visibilidade** nos arquivos analisados. Se existir, deve filtrar:
- `PRIVATE` → apenas `authorId = user.id`
- `GM_ONLY` → apenas membros com `role = 'GM'`
- `CAMPAIGN` → todos os membros

```typescript
// Se houver GET /api/campaigns/[id]/notes, deve ter:
const notes = await prisma.note.findMany({
  where: {
    campaignId: params.id,
    OR: [
      { visibility: 'CAMPAIGN' },
      { visibility: 'PRIVATE', authorId: user.id },
      { visibility: 'GM_ONLY', ...(member.role === 'GM' ? {} : { id: 'NEVER' }) },
    ],
  },
})
```

#### AUTHZ-03 — Verificação de Ownership de Fichas

**Severidade:** Média  
**Arquivo:** `apps/web/src/app/api/characters/[id]/route.ts`

A lógica de edição e deleção de fichas precisa verificar:
1. O usuário é o dono da ficha (via `CharacterSheet.memberId`)
2. OU o usuário é GM da campanha associada à ficha

Sem ver o código exato deste endpoint, há risco de que apenas uma das condições seja verificada.

#### AUTHZ-04 — Aplicação sem Prevenção de Self-Approval

**Severidade:** Média  
**Arquivo:** `apps/web/src/app/api/campaigns/[id]/applications/[appId]/route.ts`

Se o GM de uma campanha também tentar se inscrever como jogador (cenário incomum), e depois aprovar a própria inscrição, a lógica de negócio pode ter falhas. Verificar se há validação de que o aprovador não é o próprio aplicante.

#### AUTHZ-05 — `join` Endpoint (Entrada Direta em Campanha)

**Arquivo:** `apps/web/src/app/api/campaigns/[id]/join/route.ts`

Existe um endpoint `/join` separado do `/apply`. É preciso verificar se este endpoint:
1. Verifica se a campanha está aberta (`isOpen`)
2. Tem lógica diferente do apply (ex: convite direto vs. inscrição pública)
3. Não permite que usuários entrem em campanhas fechadas

#### AUTHZ-06 — Controle de Sistemas RPG

**Severidade:** Baixa  
**Arquivo:** `apps/web/src/app/api/systems/`

Os endpoints de sistemas (`GET /api/systems`, `GET /api/systems/[id]`) listam todos os sistemas sem filtro de propriedade do usuário. Se sistemas personalizados (`isPreset: false`) devem ser privados até que sejam publicados, falta verificação de acesso.

---

## 4. Análise de Escalonamento de Privilégios

### Vetores de Escalonamento Vertical (Player → GM)

**Cenário 1: Modificar Parâmetros de URL**  
Um player que conhece o `id` de uma campanha poderia tentar chamar endpoints GM-only diretamente. Todos os endpoints GM-only verificam `isGM` explicitamente — **protegido**.

**Cenário 2: Manipular Payload**  
Um player tenta enviar `{ "role": "GM" }` no body de uma requisição. Os endpoints não permitem que usuários alterem seu próprio papel — **protegido**.

**Cenário 3: Injeção via tokensJson**  
Um player com permissão `live` envia `tokensJson` com campos adicionais. O merge implementado (`{ ...prev, x: t.x, y: t.y }`) preserva campos GM-only do token existente — **parcialmente protegido** (ver T-01 na modelagem de ameaças).

### Vetores de Escalonamento Horizontal (Player → Dados de Outro Player)

**Cenário 4: Acessar Ficha de Outro Jogador**  
Se o endpoint `GET /api/characters/[id]` não verifica ownership antes de retornar dados da ficha, um player poderia adivinhar o ID da ficha de outro player e acessá-la. O campo `isPublic` da ficha controla isso, mas precisa ser verificado.

**Cenário 5: Notas Privadas de Outro Jogador**  
Se o filtro de visibilidade de notas não estiver implementado corretamente, um player poderia ler notas `PRIVATE` de outros jogadores. **Risco de alta prioridade para verificação.**

---

## 5. Análise do Bot Discord

O bot Discord tem sua própria camada de autorização em `apps/bot/src/lib/permissions.ts`:

```typescript
// Verificações implementadas no bot:
isGM(discordId, campaignId)     // Verifica papel GM
getMember(discordId, campaignId) // Verifica membership
canViewNPC(discordId, npcId)    // Verifica visibilidade de NPC
getActiveSession(campaignId)    // Verifica sessão ativa
```

**✅ Bot tem sua própria camada de autorização** — não depende apenas da API web.

**⚠️ Risco (AUTHZ-07):** O bot opera diretamente no banco de dados (via Prisma), não via API REST. Isso significa que mudanças na lógica de autorização na API web **não são automaticamente aplicadas** ao bot. As duas implementações podem divergir.

---

## 6. Recomendações

### Prioridade Crítica

1. **Auditar todos os endpoints aninhados** para garantir que `[sessionId]`, `[npcId]`, etc. sempre sejam buscados com `campaignId` na query (evitar BOLA cross-campaign).

### Prioridade Alta

2. **Verificar e implementar filtro de visibilidade de notas** em qualquer endpoint GET de notas.

3. **Verificar lógica de ownership de fichas** no endpoint `GET/PATCH/DELETE /api/characters/[id]`.

4. **Adicionar validação de join endpoint** para campanhas fechadas.

### Prioridade Média

5. **Sincronizar lógica de autorização** entre API web e bot Discord — idealmente centralizar em `packages/database` ou criar um pacote `packages/auth-logic`.

6. **Auditar endpoint `/api/systems`** para verificar se sistemas privados precisam de controle de acesso.

### Prioridade Baixa

7. **Documentar todas as regras de autorização** em um único lugar para facilitar auditorias futuras.

---

## 7. Resumo de Achados

| ID | Descrição | Severidade | Status |
|---|---|---|---|
| AUTHZ-01 | Endpoints aninhados — isolamento de campaignId | Alta | Parcialmente OK |
| AUTHZ-02 | Filtro de visibilidade de notas | Alta | Verificar |
| AUTHZ-03 | Ownership de fichas (player vs GM) | Média | Verificar |
| AUTHZ-04 | Prevenção de self-approval de inscrições | Média | Verificar |
| AUTHZ-05 | Endpoint /join — verificações de campanha aberta | Média | Verificar |
| AUTHZ-06 | Sistemas RPG — controle de privacidade | Baixa | Verificar |
| AUTHZ-07 | Divergência de lógica bot vs API web | Média | Risço de manutenção |
