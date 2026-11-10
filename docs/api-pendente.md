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
| Retrato no momento da criação | Moldura da prévia. |

## Ficha de D&D 5e (`components/screens/ficha/vals.ts`)

| Recurso | Uso no front |
|---|---|
| Traços (origem, nome, descrição) e recursos de classe com usos | Aba Traços e recursos (Canalizar Divindade, Sentido Divino…) |

## Criar Sistema (`components/screens/criarsistema/vals.ts`)

`POST /api/systems` já cria o sistema (nome, descrição, categoria) e `POST /api/systems/[id]/attributes` os atributos. O front manda também, para a API gravar: `dadoBase`, `mecanica` (sum/pool/under), `dificuldade`, `critico`, `couro`, `icone`, `recursos: [{ nome, formula, cor }]`, `visibilidade` (Privado / Só minhas mesas / Comunidade), `permitirClonar`, `permitirImportadas`. Sigla e faixa de cada atributo hoje vão na descrição; o ideal é ter campos próprios.

## Mensagens (`components/screens/mensagens/vals.ts`)

Feito (2026-11-09): tabela `Mensagem` (canal da campanha fora da sessão, diretas entre quem divide campanha, em personagem) e `Leitura` (não lidas, selo do header); `GET/POST /api/mensagens`, `GET/POST /api/mensagens/lido`. Com a sessão ao vivo, a mensagem fora de personagem continua indo para o chat da Mesa (`RollLog`). Falta:

| Recurso | Uso no front |
|---|---|

## Perfil (`components/screens/perfil/vals.ts`)

| Chamada | Contrato |
|---|---|
| Foto do perfil | Feito: enviar imagem, usar a do Discord ou remover (`POST /api/uploads` + `PATCH /api/perfil { avatar }`). O @ é o do Discord e não muda. |
| Publicar rolagens no servidor | A preferência é gravada, mas o bot ainda não publica as rolagens do site no Discord. |
| Servidores com o bot | `[{ nome, canal, status }]` |
| Vincular Google / e-mail e senha / excluir conta | Aba Conta e Conexões (2FA e dispositivos já funcionam em /perfil/seguranca) |
| Títulos conquistados | "Título exibido" |
| Preferências de e-mail e resumo semanal | hoje no navegador |

## Convite (`components/screens/convite/vals.ts`)

| Chamada | Contrato | Observações |
|---|---|---|
| Códigos recebidos no Discord | lista `{ codigo, de }` | Linha "Recebidos no Discord"; sem fonte, fica escondida. |

## Mesa (`components/screens/mesa/vals.ts`)

| O quê | Observação |
|---|---|
| Cenas da sessão (nome, mapa, miniatura) | O cabeçalho do design troca de cena; hoje há um só `mapImageUrl`. |
| Upload de imagem do mapa | Feito: soltar ou colar a imagem no mapa (bucket `saga-uploads`). |
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

## Uploads (bucket `saga-uploads`) — 2026-11-09

`POST /api/uploads` (multipart `file`, `para`: mapa · capa · handout · retrato · avatar) confere a permissão, os bytes (PNG/JPG/WEBP/GIF) e o limite de 4 MB, e devolve `{ url }` pública. Precisa de `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` na Vercel. Trocar ou apagar a imagem de um mapa, da capa ou da foto apaga o arquivo antigo do bucket. Falta botão de envio no design para: capa da campanha (Painel / Nova Campanha), retrato (Criar Personagem / fichas) e imagem do handout.

## Telas que esperavam API — feito (2026-11-10)

- **Ficha Personalizada** (sistemas de usuário, no lugar da FichaAntiga): `lib/sistema-proprio.ts` monta atributos (sigla, faixa, perícias) e recursos por fórmula; rolagem pela mecânica do sistema. Sistemas antigos sem os campos novos são lidos pela descrição (`FOR · 3–18`, `Perícia`).
- **Inventário, moedas e XP** (Ficha de D&D e Personalizada): `CharacterSheet.inventarioJson`, `moedasJson`, `xp`, `xpHistoricoJson`; `PATCH /api/characters/[id]` com `inventario`, `moedas`, `xpGanho`. Peças em `components/inventario` (recortadas por `scripts/recortar-inventario.js`).
- **Criar Sistema**: capa por URL, `copyFromSystemIds`, `RPGSystem.mecanica/dadoBase/recursosJson/configJson`, `SystemAttribute.sigla/minimo/maximo/tipo/base`.
- **Mensagens Mestre**: sussurro selado (`Mensagem.paraId` em mensagem de campanha + `abertoEm`), recado fixado (`Campaign.recado`, `PUT /api/campaigns/[id]/recado`), "escrevendo…" (tabela `Digitando`).
- **Segurança** (`/perfil/seguranca`): TOTP com segredo cifrado e 10 códigos de recuperação; o login do Discord de quem tem 2FA passa por `/verificar` antes de criar a sessão. Dispositivos: tabela `Dispositivo`, o JWT leva `dispId`; encerrar derruba a sessão em até 1 minuto. O passo de código no login reaproveita o "Digite o código" da Segurança (não há tela própria no design).
