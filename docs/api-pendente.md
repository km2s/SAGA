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
| `Campaign.inviteCode String @unique` (8 caracteres, exibido XXXX-XXXX) | Código de convite em Campanhas, Painel (regenerar) e Convite (entrar pelo código). Hoje o `/join` usa o id da campanha. |
| `Campaign.archivedAt DateTime?` | Filtro "Arquivadas" em Campanhas e "Encerrar a crônica" no Painel › Config. |
| Sessões agendadas (data/hora da próxima sessão) | Meta do atalho ("Tormenta20 · sábado, 20h") e agenda do Painel do Mestre / Início. |

## Nova Campanha (`components/screens/novacampanha/vals.ts`)

`POST /api/campaigns` já recebe `systemId` (pré-definido ou homebrew do usuário) e grava nome, descrição, sistema, tipo, tom (`contentTone`/`playStyle`), frequência, vagas (`maxSlots`), Taverna (`isOpen`) e `minExperience`. O front já manda também, para a API passar a gravar:

| Campo enviado | Destino proposto |
|---|---|
| `capa` (índice do gradiente) e upload de imagem | `Campaign.coverUrl` / cor da capa |
| `tons` (lista do design), `classificacao` (Livre/14+/18+) | tons completos e classificação indicativa |
| `permitirImportadas`, `visibilidadeRolagens` (Todos / Só o mestre / Cada um escolhe) | configuração da campanha; a visibilidade conversa com as rolagens privadas |
| `agenda: { dia, primeiraSessao, horario, duracaoHoras }` | agendamento das sessões |
| `local` (saga / presencial / discord) | onde a mesa acontece |
| `inviteCode` (8 caracteres, gerado no navegador) | `Campaign.inviteCode` — o servidor confirma ou gera outro se já existir |
| `discord: { servidor, canal }` | `guildId` + canal dos lembretes (1 h antes) |
| `aprovarInscricoes`, `chamadaTaverna` | inscrições e anúncio em Explorar |
| Lista de servidores do Discord do usuário | chips "Servidor" (hoje vazios) |
| `RPGSystem.baseDie` | "Dado base" (hoje um mapa fixo dos pré-definidos em `lib/system-dado.ts`) |

## Painel do Mestre (`components/screens/painel/vals.ts`)

Já funcionam com a API atual: iniciar sessão (`sessions/start`, 409), barras de recurso (`PATCH` campanha `resourceTracks`), Taverna aberta (`isOpen`), NPC rápido (`POST npcs`), visibilidade do NPC (`PATCH npcs/[npcId]` `isPublic`), inscrições (`PATCH applications/[appId]`), criar nota (`POST notes`, quando a nota tem conteúdo).

| Chamada | Contrato | Observações |
|---|---|---|
| `POST /api/campaigns/[id]/fios` | `{ texto }` → fio; `PATCH .../fios/[fioId]` `{ feito }` | Fios soltos (Visão geral). Precisa de tabela; hoje a lista começa vazia e não persiste. |
| `POST /api/campaigns/[id]/sessoes-agendadas` | `{ titulo, data, horario, lembrete }`; `DELETE .../[agId]` | "Agendar sessão" e "Próximas". O bot lembra 1 h antes. |
| `PATCH /api/campaigns/[id]/notes/[noteId]` | `{ title, content, visibility }` | Edição de nota (hoje só existe criar). |
| `PATCH /api/campaigns/[id]` `{ name }` | renomear | O PATCH atual não aceita `name`. |
| Visibilidade das rolagens da campanha | Todos / Só o mestre / Cada um escolhe | Liga com as rolagens privadas. |
| `POST /api/campaigns/[id]/convite` | `{ codigo }` → código confirmado | "Gerar novo" invalida o antigo (`Campaign.inviteCode`). |
| Ligar/desligar o bot; servidor e canal do Discord | | Linha "Lembretes e rolagens em #canal · Servidor". |
| `POST /api/campaigns/[id]/arquivar` | → `200` | `Campaign.archivedAt`; depois volta para /campanhas. |

## Criar Personagem

| Recurso | Uso no front |
|---|---|
| Ficha sem campanha | Opção "Sem campanha" do design (hoje `CharacterSheet.memberId` é obrigatório). |
| Segredo do personagem (só dono e mestre) | Campo "Segredos — só o mestre vê"; não pode aparecer na ficha pública. |
| Retrato no momento da criação | Moldura da prévia. |

## Ficha de D&D 5e (`components/screens/ficha/vals.ts`)

| Recurso | Uso no front |
|---|---|
| Magias (nome, círculo, concentração, tempo/alcance, descrição) e preparadas | Aba Magias (hoje vazia) |
| Inventário (ícone, nome, descrição, quantidade, peso, equipado/consumível/missão) e moedas | Aba Inventário, carga e CA por armadura/escudo |
| XP | Barra de XP do cabeçalho (hoje escondida) |
| Traços (origem, nome, descrição) e recursos de classe com usos | Aba Traços e recursos (Canalizar Divindade, Sentido Divino…) |
| PV temporários, testes contra a morte, inspiração, dados de vida gastos, reserva de Cura pelas Mãos | Hoje só na tela |
| Atributo de conjuração | Ataque mágico e CD de magia |

## Criar Sistema (`components/screens/criarsistema/vals.ts`)

`POST /api/systems` já cria o sistema (nome, descrição, categoria) e `POST /api/systems/[id]/attributes` os atributos. O front manda também, para a API gravar: `dadoBase`, `mecanica` (sum/pool/under), `dificuldade`, `critico`, `couro`, `icone`, `recursos: [{ nome, formula, cor }]`, `visibilidade` (Privado / Só minhas mesas / Comunidade), `permitirClonar`, `permitirImportadas`. Sigla e faixa de cada atributo hoje vão na descrição; o ideal é ter campos próprios.

## Mensagens (`components/screens/mensagens/vals.ts`)

Hoje o canal da campanha é o chat da sessão ativa (`RollLog` com `expression = 'chat'`), lido pelo `GET rolls?since=` a cada 4 s. Falta:

| Recurso | Uso no front |
|---|---|
| Mensagens diretas entre usuários | Grupo "Diretas" (hoje vazio) |
| Canal da campanha fora da sessão | Hoje só dá para escrever com sessão ativa |
| Mensagem em personagem (flag + nome do personagem) | Modo "Em personagem" |
| Sussurro do mestre (selado, só um destinatário) | Bolha selada que rompe ao clicar |
| Recado fixado e próxima sessão no painel lateral | "Fixado" e agenda |
| Não lidas | Selo do header e contadores da lista |
| Indicador "escrevendo…" | Linha de digitação (hoje usada para avisos de erro) |

## Perfil (`components/screens/perfil/vals.ts`)

| Chamada | Contrato |
|---|---|
| `PATCH /api/perfil` | `{ nome, usuario, bio, titulo, moldura, avatar: 'discord' \| 'custom' }` + upload do retrato |
| `POST /api/perfil/sincronizar` | Atualiza nome e avatar a partir do Discord |
| Preferências do Discord | foto, nome, lembretes por DM, publicar rolagens no servidor |
| Servidores com o bot | `[{ nome, canal, status }]` |
| Vincular Google / e-mail e senha / 2FA / dispositivos (sessões ativas, encerrar) / excluir conta | Aba Conta e Conexões |
| Títulos conquistados | "Título exibido" |
| Preferências de e-mail e resumo semanal | hoje no navegador |

## Convite (`components/screens/convite/vals.ts`)

| Chamada | Contrato | Observações |
|---|---|---|
| `GET /api/convites/[codigo]` | → `{ campanha: { id, n, sys, fmt, gm, when, next, tone, taken, tot, d, members: [{ u, t }] }, personagens: [{ id, t, d }] }` ou `404` | Código sem hífen, 8 caracteres (`Campaign.inviteCode`). `personagens` = fichas do usuário no mesmo sistema que podem ir para a mesa. `taken`/`tot` = vagas ocupadas/total (`maxSlots`). |
| `POST /api/convites/[codigo]` | `{ personagem: <id> \| 'new' \| 'later' }` → `201 { campaignId }`, `409` se já é membro | Cria o `CampaignMember`; com `<id>`, leva a ficha. Avisa o mestre (Discord). |
| Códigos recebidos no Discord | lista `{ codigo, de }` | Linha "Recebidos no Discord"; sem fonte, fica escondida. |

## Primeiros Passos

| Campo/recurso | Uso no front |
|---|---|
| Progresso do tour no usuário (`phase`, ritos feitos, rito atual) | Hoje em `localStorage` (`lib/tour-store.ts`); no usuário, vale em qualquer dispositivo. |

## Mesa (`components/screens/mesa/vals.ts`)

| O quê | Observação |
|---|---|
| Cenas da sessão (nome, mapa, miniatura) | O cabeçalho do design troca de cena; hoje há um só `mapImageUrl`. |
| Névoa na sessão (`nevoaJson`: áreas em casas, revelada ou não) | Hoje só no navegador do mestre; com isso o jogador passa a ver a névoa de verdade. |
| Upload de imagem do mapa | "Trocar mapa" do design é soltar a imagem; hoje é link. |
| Bônus de ataque e CA do token/ficha | O popover do design mostra CA e "Rolar ataque +N". |
| Perícias na ficha | A aba Fichas do design lista perícias roláveis. |

## Rolagens privadas (SAGA Mesa, SAGA Sessao) — feito (2026-11-08)

- Banco: `enum RollVisibility { PUBLIC SELF GM BLIND GM_SECRET }`, `RollLog.visibility @default(PUBLIC)`, `RollLog.revealedAt`, `RollLog.memberId` (migração `20261108000000_add_roll_visibility`).
- Regra única de quem vê o quê em `packages/database/src/rolagens.ts` (site e bot). No site, `lib/rolagens.ts` serializa: o total e os dados nunca saem para quem não pode ver.
- `POST /api/campaigns/[id]/rolls` aceita `visibility` (limitada pelo papel; o resto vira pública). Às cegas: nem quem rolou recebe o resultado.
- `GET .../rolls` filtra e devolve `mode` (`full` / `sealed` / `ghost`), `porMestre`, `revealed`; revelações voltam pela sondagem (`revealedAt > since`).
- `PATCH .../rolls/[rollId]` `{ revelar: true }` (só o mestre; não vale para "só para mim" de jogador).
- Leitores filtrados: Mesa (nova e antiga), Painel (atividade e contagem), Sessão (registro, estatísticas e destaque contam só o que o leitor vê; o mestre vê os contadores), lista de sessões, Mensagens (canal), Perfil (vinte natural ignora às cegas), visão geral do jogador.
- Bot: `/iniciativa ver` mostra no canal só as públicas e manda a quem pode ver mais a ordem completa numa resposta só para si; `/sessao status|encerrar` conta só as públicas no canal e manda ao mestre, só para ele, "N rolagens · X secretas · Y às cegas". O bot grava `memberId` nas rolagens. Mensagens de chat deixaram de contar como rolagem no `/sessao`.