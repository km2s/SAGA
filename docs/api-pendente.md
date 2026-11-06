# API pendente do redesign

O front do redesign (`Saga NOVO/handoff-claude-code/`) é feito primeiro e já chama
os endpoints abaixo. Eles entram na fase da API. Cada chamada no front está
marcada com `TODO(api)`.

O SAGA está em produção: **front e API sobem juntos.** Sem estes endpoints, as
telas novas quebram.

## Conta (SAGA Login) — `lib/auth-client.ts`

| Chamada | Contrato | Observações |
|---|---|---|
| `signIn('google')` | Provider Google no NextAuth | Hoje só existe o Discord. `User` é indexado por `discordId`: precisa de um vínculo de conta que não dependa do Discord. |
| `signIn('credentials', { email, password, remember })` | Provider Credentials | `remember: 'true' \| 'false'` define a duração da sessão. Falha → `error` em PT-BR, ou `CredentialsSignin` (o front mostra "E-mail ou senha incorretos."). |
| `POST /api/auth/cadastro` | `{ username, email, password }` → `201` ou `{ error }` | Mesmas regras do front: nome ≥ 3, sem espaços, único; e-mail válido; senha ≥ 8. Depois do 201 o front entra com as mesmas credenciais. Rate limit. |
| `POST /api/auth/recuperar-senha` | `{ email }` → `200` | Sempre 200, mesmo se o e-mail não existir (não revela contas). O link vale 30 minutos (copy da tela). |
| `GET /api/auth/usuario-disponivel?u=` | → `{ disponivel: boolean }` | Comparação sem diferenciar maiúsculas. Rate limit (é enumerável). |

Copy que não está no design e precisa de confirmação:
- "E-mail ou senha incorretos." (credenciais erradas)
- "Não foi possível concluir agora. Tente de novo." (falha de rede ou de servidor)

## Campanhas (SagaHeader e telas de campanha)

| Campo/recurso | Uso no front |
|---|---|
| `Campaign.coverUrl String?` | Capa nos atalhos do header (`app/(app)/layout.tsx`, hoje `capa: null`) e nas telas de campanha. Sem capa, o front mostra o gradiente do design. |
| Sessões agendadas (data/hora da próxima sessão) | Meta do atalho ("Tormenta20 · sábado, 20h") e agenda do Painel do Mestre / Início. |

## Primeiros Passos

| Campo/recurso | Uso no front |
|---|---|
| Progresso do tour no usuário (`phase`, ritos feitos, rito atual) | Hoje em `localStorage` (`lib/tour-store.ts`); no usuário, vale em qualquer dispositivo. |

## Rolagens privadas (SAGA Mesa, SAGA Sessao)

Proposta do handoff: `enum RollVisibility { PUBLIC SELF GM BLIND GM_SECRET }`,
`RollLog.visibility @default(PUBLIC)` e `RollLog.revealedAt DateTime?`.

O filtro de visibilidade tem de valer em **todo** leitor de `RollLog`, não só no
`GET /api/campaigns/[id]/rolls`:
- `app/(app)/campaign/[id]/mesa/page.tsx` (rolagens iniciais, SSR)
- `app/(app)/campaign/[id]/page.tsx` (rolagens recentes, SSR)
- `app/(app)/campaign/[id]/sessions/[sessionId]/page.tsx` (registro e estatísticas)
- Bot `/iniciativa ver` (publica os totais no canal) e `/sessao` (conta as rolagens)

Em aberto: iniciativa em modo privado no bot; se o `/sessao` conta só as públicas.
