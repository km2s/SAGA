# Plano de Testes de Segurança — Saga RPG
**Data:** 2026-06-24  
**Versão:** 1.0  
**Classificação:** Uso Interno — Apenas Ambiente Autorizado

> ⚠️ **IMPORTANTE:** Este plano é exclusivamente para testes em ambiente de desenvolvimento/staging autorizado. Nunca execute estes testes em produção sem consentimento explícito do proprietário do sistema.

---

## 1. Escopo e Ambiente

**Ambiente-alvo:** Instância local (`http://localhost:3000`) ou ambiente de staging dedicado  
**Ferramentas necessárias:** Navegador, DevTools, `curl` ou Postman/Insomnia, conta Discord de teste

---

## 2. Testes de Autenticação

### TEST-AUTH-01: Acesso a Rotas Protegidas sem Sessão

**Objetivo:** Verificar que rotas protegidas retornam 401/redirect sem autenticação

**Procedimento:**
```bash
# Limpar cookies do navegador e tentar acessar:
curl -i http://localhost:3000/dashboard
curl -i http://localhost:3000/campaign/qualquer-id

# Resultado esperado: Redirect para /login (302) ou 401
```

**Critério de Aprovação:** Redireciona para `/login` ou retorna `401 Unauthorized`

---

### TEST-AUTH-02: Acesso a APIs sem Token de Sessão

**Objetivo:** Verificar que todos os endpoints de API exigem autenticação

**Procedimento:**
```bash
# Sem Cookie de sessão:
curl -i -X GET http://localhost:3000/api/campaigns
curl -i -X POST http://localhost:3000/api/campaigns/[id]/apply \
  -H "Content-Type: application/json" \
  -d '{"characterDesc":"test"}'
curl -i -X PATCH http://localhost:3000/api/campaigns/[id]/route \
  -H "Content-Type: application/json" \
  -d '{"name":"hack"}'

# Resultado esperado: 401 Unauthorized
```

**Endpoints críticos a testar (todos devem retornar 401 sem sessão):**
- `GET /api/campaigns`
- `POST /api/campaigns`
- `GET /api/campaigns/open`
- `POST /api/characters/import`
- `PATCH /api/campaigns/[id]/sessions/state`
- `POST /api/campaigns/[id]/rolls`

**Critério de Aprovação:** Todos retornam `{ "error": "Unauthorized" }` com status 401

---

### TEST-AUTH-03: Health Check sem Autenticação (Verificar Vulnerabilidade)

**Objetivo:** Confirmar que `/api/health` expõe dados sem autenticação

**Procedimento:**
```bash
curl -i http://localhost:3000/api/health
```

**Critério de Aprovação (após correção):** Deve retornar 401 ou dados mínimos sem hostname

---

### TEST-AUTH-04: Expiração de Sessão

**Objetivo:** Verificar comportamento com sessão expirada

**Procedimento:**
1. Autenticar com conta Discord de teste
2. Manipular o cookie de sessão (alterar `exp` para timestamp passado)
3. Tentar acessar API

**Critério de Aprovação:** Retorna 401 com sessão expirada/inválida

---

### TEST-AUTH-05: Cookie HttpOnly e Secure

**Objetivo:** Verificar atributos de segurança dos cookies de sessão

**Procedimento:**
1. Autenticar com conta Discord de teste
2. Inspecionar cookies no DevTools (Application → Cookies)
3. Tentar acessar o cookie via JavaScript: `document.cookie`

**Resultado esperado:** Cookie `next-auth.session-token` deve ter:
- `HttpOnly: true` — invisível via `document.cookie`
- `Secure: true` (em produção HTTPS)
- `SameSite: Lax` (mínimo) ou `Strict` (ideal)

**Critério de Aprovação:** Cookie não acessível via JavaScript

---

## 3. Testes de Autorização

### TEST-AUTHZ-01: Player Tentando Ações de GM

**Objetivo:** Verificar que endpoints GM-only bloqueiam players

**Pré-requisito:** Duas contas Discord (GM e Player) na mesma campanha

**Procedimento (usando sessão do Player):**
```bash
# Extrair cookie de sessão do player do navegador e usar em:

# Tentar criar NPC (GM-only)
curl -i -X POST http://localhost:3000/api/campaigns/[campaign-id]/npcs \
  -H "Cookie: next-auth.session-token=[player-token]" \
  -H "Content-Type: application/json" \
  -d '{"name":"NPC Indevido","type":"ALLY"}'

# Tentar iniciar sessão (GM-only)
curl -i -X POST http://localhost:3000/api/campaigns/[campaign-id]/sessions/start \
  -H "Cookie: next-auth.session-token=[player-token]"

# Tentar aprovar inscrição (GM-only)
curl -i -X PATCH http://localhost:3000/api/campaigns/[campaign-id]/applications/[app-id] \
  -H "Cookie: next-auth.session-token=[player-token]" \
  -H "Content-Type: application/json" \
  -d '{"status":"approved"}'
```

**Critério de Aprovação:** Todos retornam `403 Forbidden`

---

### TEST-AUTHZ-02: Acesso Cross-Campaign

**Objetivo:** Verificar que membros não podem acessar dados de outra campanha

**Pré-requisito:** Usuário membro de campanha A, não membro de campanha B

**Procedimento:**
```bash
# Como membro de campanha A, tentar acessar dados de campanha B:
curl -i http://localhost:3000/api/campaigns/[campaign-b-id]/npcs \
  -H "Cookie: next-auth.session-token=[user-token]"

curl -i http://localhost:3000/api/campaigns/[campaign-b-id]/sessions/state \
  -H "Cookie: next-auth.session-token=[user-token]"
```

**Critério de Aprovação:** Retorna 403 ou 404 (não retorna dados da campanha B)

---

### TEST-AUTHZ-03: Editar Ficha de Outro Jogador

**Objetivo:** Verificar ownership de fichas

**Pré-requisito:** Dois players na mesma campanha, cada um com sua ficha

**Procedimento:**
```bash
# Player A tenta editar ficha do Player B:
curl -i -X PATCH http://localhost:3000/api/characters/[player-b-sheet-id] \
  -H "Cookie: next-auth.session-token=[player-a-token]" \
  -H "Content-Type: application/json" \
  -d '{"name":"Hackeado"}'
```

**Critério de Aprovação:** Retorna 403 Forbidden

---

### TEST-AUTHZ-04: Visibilidade de NPC

**Objetivo:** Verificar que players não veem NPCs privados

**Pré-requisito:** NPC criado pelo GM sem isPublic e sem NPCVisibility para o player

**Procedimento:**
```bash
# Player tenta acessar NPC privado diretamente pelo ID:
curl -i http://localhost:3000/api/campaigns/[id]/npcs/[private-npc-id] \
  -H "Cookie: next-auth.session-token=[player-token]"
```

**Critério de Aprovação:** Retorna 404 (não 403 — não revelar existência)

---

### TEST-AUTHZ-05: Visibilidade de Notas

**Objetivo:** Verificar que notas PRIVATE e GM_ONLY são isoladas

**Procedimento:**
1. Player A cria nota PRIVATE
2. Player B tenta listar notas da campanha
3. Verificar que nota PRIVATE de A não aparece para B

4. GM cria nota GM_ONLY
5. Player B tenta ver a lista de notas
6. Verificar que nota GM_ONLY não aparece para Player B

**Critério de Aprovação:** Notas privadas invisíveis para usuários não autorizados

---

## 4. Testes de Validação de Input

### TEST-INPUT-01: Limite de Tamanho em Notas

**Objetivo:** Verificar que strings muito longas são rejeitadas ou truncadas

**Procedimento:**
```bash
# Nota com conteúdo de 1MB
python3 -c "print('A' * 1048576)" > /tmp/big-note.txt

curl -i -X POST http://localhost:3000/api/campaigns/[id]/notes \
  -H "Cookie: next-auth.session-token=[token]" \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"$(cat /tmp/big-note.txt)\",\"visibility\":\"PRIVATE\"}"
```

**Critério de Aprovação (após correção):** Retorna 400 ou trunca para o limite definido

---

### TEST-INPUT-02: Injeção em markersJson

**Objetivo:** Verificar que markersJson aceita apenas estrutura válida

**Procedimento:**
```bash
# Tentar injetar dado arbitrário:
curl -i -X PATCH http://localhost:3000/api/campaigns/[id]/sessions/state \
  -H "Cookie: next-auth.session-token=[gm-token]" \
  -H "Content-Type: application/json" \
  -d '{
    "markersJson": "{\"__proto__\": {\"polluted\": true}, \"x\": 1, \"y\": 1}"
  }'

# Tentar injetar não-array:
curl -i -X PATCH http://localhost:3000/api/campaigns/[id]/sessions/state \
  -H "Cookie: next-auth.session-token=[gm-token]" \
  -H "Content-Type: application/json" \
  -d '{"markersJson": "{\"attack\": \"<script>alert(1)</script>\"}"}'
```

**Critério de Aprovação (após correção):** Retorna 400 para estrutura inválida

---

### TEST-INPUT-03: Upload de Arquivo Malformado

**Objetivo:** Verificar robustez do parsing de PDF

**Procedimento:**
```bash
# Arquivo não-PDF com extensão .pdf:
echo "Este não é um PDF" > /tmp/fake.pdf
curl -i -X POST http://localhost:3000/api/characters/import \
  -H "Cookie: next-auth.session-token=[token]" \
  -F "file=@/tmp/fake.pdf;type=application/pdf"

# Arquivo HTML com extensão .pdf:
echo '<html><body><script>INJECTION</script>Conteúdo</body></html>' > /tmp/fake2.pdf
curl -i -X POST http://localhost:3000/api/characters/import \
  -H "Cookie: next-auth.session-token=[token]" \
  -F "file=@/tmp/fake2.pdf;type=application/pdf"
```

**Critério de Aprovação:** Retorna erro adequado sem expor detalhes de implementação

---

### TEST-INPUT-04: SSRF em mapImageUrl

**Objetivo:** Verificar que URLs de imagem são validadas contra allowlist

**Procedimento:**
```bash
# URL para metadados de cloud (potencial SSRF):
curl -i -X PATCH http://localhost:3000/api/campaigns/[id]/sessions/state \
  -H "Cookie: next-auth.session-token=[gm-token]" \
  -H "Content-Type: application/json" \
  -d '{"mapImageUrl": "http://169.254.169.254/latest/meta-data/"}'

# URL para localhost:
curl -i -X PATCH http://localhost:3000/api/campaigns/[id]/sessions/state \
  -H "Cookie: next-auth.session-token=[gm-token]" \
  -H "Content-Type: application/json" \
  -d '{"mapImageUrl": "http://localhost:5432/select-all"}'
```

**Critério de Aprovação (após correção):** Retorna 400 — Host não permitido

---

### TEST-INPUT-05: Expressão de Dados Maliciosa

**Objetivo:** Verificar que o parser de dados rejeita expressões inválidas

**Procedimento:**
```bash
# Expressões que deveriam ser rejeitadas:
EXPRS=("1000d1000+10000" "0d6" "10d1" "1d0" "$(malicious)" "'; DROP TABLE--")
for expr in "${EXPRS[@]}"; do
  curl -s -X POST http://localhost:3000/api/campaigns/[id]/rolls \
    -H "Cookie: next-auth.session-token=[token]" \
    -H "Content-Type: application/json" \
    -d "{\"expression\":\"$expr\"}"
done
```

**Critério de Aprovação:** Expressões inválidas retornam 400; `1000d1000` excede limite e retorna 400

---

## 5. Testes de Rate Limiting

### TEST-RATE-01: Abuso do Endpoint de Import (Custo de API)

**Objetivo:** Verificar que há proteção contra abuso da Anthropic API

**Procedimento:**
```bash
# Em ambiente de DESENVOLVIMENTO apenas (cria custo real em produção):
for i in {1..20}; do
  curl -s -X POST http://localhost:3000/api/characters/import \
    -H "Cookie: next-auth.session-token=[token]" \
    -F "file=@/tmp/test.pdf" \
    -o /dev/null -w "%{http_code}\n"
done
```

**Critério de Aprovação (após correção):** A partir da N-ésima requisição, retorna 429 Too Many Requests

---

### TEST-RATE-02: Flood de Presença

**Objetivo:** Verificar proteção contra flood do heartbeat de presença

**Procedimento:**
```bash
for i in {1..100}; do
  curl -s -X POST http://localhost:3000/api/campaigns/[id]/presence \
    -H "Cookie: next-auth.session-token=[token]" \
    -o /dev/null -w "%{http_code} "
done
```

**Critério de Aprovação (após correção):** 429 após N requisições por janela de tempo

---

## 6. Testes de Headers de Segurança

### TEST-HEADERS-01: Verificar Headers HTTP

**Procedimento:**
```bash
curl -I http://localhost:3000
```

**Resultado esperado:**
```
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: [política definida]       # ⚠️ Atualmente ausente
Strict-Transport-Security: max-age=63072000...     # ⚠️ Atualmente ausente
```

**Critério de Aprovação:** Todos os headers acima presentes na resposta

---

### TEST-HEADERS-02: Cache de Respostas Sensíveis

**Procedimento:**
```bash
# Verificar headers de cache em API de dados sensíveis:
curl -I http://localhost:3000/api/campaigns/[id]/npcs/[npc-id] \
  -H "Cookie: next-auth.session-token=[token]"
```

**Resultado esperado:** `Cache-Control: no-store` ou `private, no-cache`

**Critério de Aprovação (após correção):** Header Cache-Control presente

---

## 7. Testes de Business Logic

### TEST-BL-01: Re-aplicação Spam

**Objetivo:** Verificar proteção contra spam de notificações ao GM

**Procedimento:**
```bash
# Inscrever na campanha 10 vezes rapidamente:
for i in {1..10}; do
  curl -s -X POST http://localhost:3000/api/campaigns/[id]/apply \
    -H "Cookie: next-auth.session-token=[player-token]" \
    -H "Content-Type: application/json" \
    -d '{"characterDesc":"Re-apply spam test"}'
  echo ""
done
```

**Verificar:** O GM recebeu 10 DMs? (Comportamento atual: sim — deve ser corrigido)

**Critério de Aprovação (após correção):** Re-aplicação não gera nova DM dentro de um período de cooldown

---

### TEST-BL-02: Campanha Cheia

**Objetivo:** Verificar que `maxSlots` é respeitado

**Procedimento:**
1. Criar campanha com `maxSlots: 2` e 2 players já inscritos
2. Tentar inscrever um terceiro player

**Critério de Aprovação:** Retorna `409 Conflict` com mensagem "Campanha sem vagas disponíveis"

---

### TEST-BL-03: Sessão Inexistente

**Objetivo:** Verificar comportamento ao tentar sincronizar estado sem sessão ativa

**Procedimento:**
```bash
curl -i -X PATCH http://localhost:3000/api/campaigns/[id]/sessions/state \
  -H "Cookie: next-auth.session-token=[token]" \
  -H "Content-Type: application/json" \
  -d '{"markersJson":"[]"}'
```

**Critério de Aprovação:** Retorna 404 com mensagem clara (não 500)

---

## 8. Checklist de Testes por Release

| Teste | Tipo | Freq. Recomendada |
|---|---|---|
| TEST-AUTH-01 a 05 | Autenticação | A cada release |
| TEST-AUTHZ-01 a 05 | Autorização | A cada release |
| TEST-INPUT-01 a 05 | Validação | Quinzenalmente |
| TEST-RATE-01 a 02 | Rate Limiting | Após mudanças nos endpoints |
| TEST-HEADERS-01 a 02 | Headers | A cada alteração no next.config |
| TEST-BL-01 a 03 | Lógica de Negócio | A cada feature nova |
| `pnpm audit` | Dependências | Semanalmente |

---

## 9. Ferramentas Recomendadas

| Ferramenta | Propósito | Uso |
|---|---|---|
| `curl` | Testes de API CLI | Todos os testes acima |
| Postman / Insomnia | Testes de API GUI | Exploração interativa |
| OWASP ZAP (modo passivo) | Scan de headers e configuração | Análise automatizada |
| `pnpm audit` | Auditoria de dependências | CI/CD e manual |
| Chrome DevTools | Inspeção de cookies e rede | Testes de autenticação |
| Burp Suite Community | Interceptação de tráfego | Testes avançados |
