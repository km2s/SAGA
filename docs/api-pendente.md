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
| Upload da capa | `Campaign.coverUrl` já existe e aparece no header, Campanhas, Painel, Convite e visão do jogador; falta enviar a imagem (hoje só por `PATCH` com link). |
| Agenda no Início | A agenda e os pontos da semana do Início ainda mostram só a sessão ao vivo. |

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
| Servidor e canal do Discord | | Linha "Lembretes e rolagens em #canal · Servidor". O bot não guarda canal por campanha: os lembretes vão por DM. |

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
| Upload do retrato | `PATCH /api/perfil` já grava nome exibido, bio, título, moldura e as preferências do Discord (`User.prefsJson`); falta enviar imagem. O @ é o do Discord e não muda. |
| Publicar rolagens no servidor | A preferência é gravada, mas o bot ainda não publica as rolagens do site no Discord. |
| Servidores com o bot | `[{ nome, canal, status }]` |
| Vincular Google / e-mail e senha / 2FA / dispositivos (sessões ativas, encerrar) / excluir conta | Aba Conta e Conexões |
| Títulos conquistados | "Título exibido" |
| Preferências de e-mail e resumo semanal | hoje no navegador |

## Convite (`components/screens/convite/vals.ts`)

| Chamada | Contrato | Observações |
|---|---|---|
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

## Campanha, convites e agenda — feito (2026-11-08)

- Banco (migração `20261108300000_add_convite_agenda_fios`): `Campaign.inviteCode` (único; as campanhas antigas ganham um na primeira leitura, `lib/convite.ts`), `coverUrl`, `archivedAt`, `rollVisibility` (`todos` / `mestre` / `escolha`), `botEnabled`; tabelas `Fio` e `SessaoAgendada` (`quando` em horário de Brasília).
- `PATCH /api/campaigns/[id]` aceita `name`, `coverUrl`, `rollVisibility`, `botEnabled`. `POST .../convite` (gera ou confirma o código), `POST/DELETE .../arquivar` (409 com sessão ao vivo), `PATCH/DELETE .../notes/[noteId]` (só o autor), `GET/POST .../fios` e `PATCH/DELETE .../fios/[fioId]`, `GET/POST .../sessoes-agendadas` e `DELETE .../[agId]`.
- `GET/POST /api/convites/[codigo]`: busca com rate limit; entrar com uma ficha do mesmo sistema leva uma cópia dela. Arquivadas não aparecem na Taverna nem no convite.
- Rolagens: a regra da campanha vale no servidor (`visibilidadeValida(v, gm, regra)`) e a Mesa esconde o seletor do jogador quando a regra fixa o modo.
- Nova Campanha grava o código, a primeira sessão agendada e a regra de rolagens.
- Bot: lembrete por DM 1 h antes de cada sessão agendada com lembrete (`apps/bot/src/lib/lembretes.ts`, a cada 5 min).

## Rolagens privadas (SAGA Mesa, SAGA Sessao) — feito (2026-11-08)

- Banco: `enum RollVisibility { PUBLIC SELF GM BLIND GM_SECRET }`, `RollLog.visibility @default(PUBLIC)`, `RollLog.revealedAt`, `RollLog.memberId` (migração `20261108000000_add_roll_visibility`).
- Regra única de quem vê o quê em `packages/database/src/rolagens.ts` (site e bot). No site, `lib/rolagens.ts` serializa: o total e os dados nunca saem para quem não pode ver.
- `POST /api/campaigns/[id]/rolls` aceita `visibility` (limitada pelo papel; o resto vira pública). Às cegas: nem quem rolou recebe o resultado.
- `GET .../rolls` filtra e devolve `mode` (`full` / `sealed` / `ghost`), `porMestre`, `revealed`; revelações voltam pela sondagem (`revealedAt > since`).
- `PATCH .../rolls/[rollId]` `{ revelar: true }` (só o mestre; não vale para "só para mim" de jogador).
- Leitores filtrados: Mesa (nova e antiga), Painel (atividade e contagem), Sessão (registro, estatísticas e destaque contam só o que o leitor vê; o mestre vê os contadores), lista de sessões, Mensagens (canal), Perfil (vinte natural ignora às cegas), visão geral do jogador.
- Bot: `/iniciativa ver` mostra no canal só as públicas e manda a quem pode ver mais a ordem completa numa resposta só para si; `/sessao status|encerrar` conta só as públicas no canal e manda ao mestre, só para ele, "N rolagens · X secretas · Y às cegas". O bot grava `memberId` nas rolagens. Mensagens de chat deixaram de contar como rolagem no `/sessao`.