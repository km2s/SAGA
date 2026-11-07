# Redesign — decisões e lacunas para revisar

Tudo que foi decidido sem estar no design (`Saga NOVO/handoff-claude-code/`)
durante a implementação. Endpoints e campos que faltam estão em `api-pendente.md`.

## Geral
- Cada tela tem seu CSS Module: os `@keyframes` têm o mesmo nome com valores diferentes entre arquivos.
- `[data-s]` nunca envolve telas antigas: elas usam `--ink` como canais RGB.
- Rotas: `/characters` → `/personagens`, `/systems` → `/sistemas` (redirects permanentes).

## Login
- Copy aprovada pela Karine: "E-mail ou senha incorretos." e "Não foi possível concluir agora. Tente de novo."
- Disponibilidade do nome: checagem com debounce de 350 ms; enquanto não volta, não mostra nada.

## SagaHeader
- Capa da campanha e próxima sessão agendada: o front já recebe os campos; entram no schema na fase da API (aprovado).
- Menu da conta: nome de exibição do Discord (`global_name`) + @username, como no design.
- Selo de mensagens não lidas some com 0 (não há API de mensagens).

## Conversor (`scripts/dc-to-jsx.ps1`)
- A partir da Landing, os templates são gerados do `.dc.html` (estilos inline 1:1, `style-hover` → classe com `!important`, keyframes com prefixo da tela). A lógica fica em `vals.ts`, escrita à mão.
- Depois de gerado, o `Template.tsx` pode ser ajustado à mão (textos de demonstração ligados a dados reais). Regerar sobrescreve esses ajustes.
- Ícones `circle-help` → `CircleQuestionMark` (nome do lucide-react 1.x).
- Ícone em `<span>` inline fora de flex/grid: no design ficaria com largura zero; aqui vira `inline-block` (visível).

## Landing
- Capa e retrato da vitrine (`image-slot`): sem imagens enviadas, fica o gradiente do design.

## Início (`/dashboard`)
- Usa o SagaHeader compartilhado no lugar do header próprio do Inicio v2 (que não tem o menu da conta). Focar a busca do header abre a paleta ⌘K.
- Data, saudação e cronômetro calculados no navegador (fuso do usuário). Saudação varia: Bom dia (5–12h), Boa tarde (12–18h), Boa noite.
- Bloco "ao vivo" só aparece com sessão ativa; título = nome da sessão (ou "Sessão N" em romano), linha de baixo = campanha. "combate em andamento, turno 2" não tem dado.
- Grupo = fichas dos jogadores da campanha ao vivo (PV da ficha).
- Lista de campanhas: "Sessão N" pela contagem de sessões; "Próxima sessão" mostra "Agora · ao vivo" ou "—" até existir agendamento.
- Semana = semana atual (seg–dom); agenda e pontos só com a sessão ao vivo de hoje (agendamento é da API).
- Rolagem rápida: com sessão ao vivo, rola no servidor e vai para o log; sem sessão, rola no navegador.
- Inscrições: pendentes das campanhas em que você é o mestre; Aceitar/Recusar chamam o PATCH existente.
- Paleta ⌘K: suas campanhas (ícone coroa = mestre, mapa = jogador), seus personagens e as páginas. Sem NPCs e sem contagem de mensagens.

## Primeiros Passos (tour)
- Roda por cima do app real (layout de `(app)`), no lugar do OnboardingChecklist. O dashboard falso do design não foi portado; os spotlights miram os elementos reais do Início (`data-tour="nova|camps|dice"`).
- Abre a apresentação com `?tour=1` (cadastro e o item "Primeiros Passos" do menu da conta). Sem tour salvo, começa minimizado; quem tinha dispensado o checklist antigo começa fechado.
- Progresso no navegador (`saga_tour_v2`), com os ritos já feitos detectados: campanha (tem campanha), NPC (tem NPC numa campanha sua como mestre), Painel/NPCs/Mesa (chaves antigas `saga_visited_*`).
- Ritos de visita: aviso de 1 s, conta como feito e navega para a página (Painel, NPCs e Mesa da sua primeira campanha).
- "Fundar campanha" cria a campanha de verdade (`POST /api/campaigns`). Mapeamento dos sistemas: VtM V5 → Vampire: The Masquerade V5; Call of Cthulhu → Call of Cthulhu 7e; Outro → Personalizado; Ordem Paranormal não tem pré-definido (a API cria o sistema).
- "Rolar 1d20" rola na rolagem rápida do Início (fora dele, leva até lá).
- Com o guia fechado, o botão "❦ Primeiros passos N/6" aparece no SagaHeader (no design ficava no header próprio da tela).

## Campanhas (`/campanhas`)
- Campanha sem sistema aparece como "Sistema próprio".
- Frequência: rótulo do campo `sessionFrequency` (Semanal/Quinzenal/Mensal/Esporádico) ou "One-shot"; dia e hora entram com o agendamento.
- Personagem do membro: "Nome · Nv N"; sem ficha, "Sem personagem". Online = sinal de presença nos últimos 60 s.
- Sessão ao vivo: "Sessão N — nome da sessão"; "Iniciada às HH:MM · X de Y na mesa".
- Código de convite mostra "—" e "Copiar" não faz nada até existir `inviteCode`. "Arquivadas" fica vazio até existir `archivedAt`.

## Convite
- Busca e aceite pelo código chamam `/api/convites/[codigo]` (fase da API). "Recebidos no Discord" fica escondido sem fonte de dados.
- O "Aceitar" com erro volta para o estado "não encontrada" com shake.

## Nova Campanha (`/campanhas/nova`)
- Estante de sistemas = pré-definidos (ordem do seed) + seus homebrews. Couro e ícone da lombada pela categoria (genérico e personalizado usam o couro de fantasia; ícones: espadas, lua, olho, chip, dados, pena).
- "Dado base" vem de um mapa dos pré-definidos; homebrew mostra "—".
- O `POST /api/campaigns` passou a aceitar `systemId` (antes, escolher um homebrew criaria um sistema duplicado).
- Tons do design viram `contentTone` (Épico/Sombrio/Horror/Político) e `playStyle` (Mistério/Exploração/Combate/Cômico/Horror). "Iniciantes bem-vindos" desligado → `minExperience = intermediate`.
- Primeira sessão começa com a data de hoje; código de convite gerado no navegador. Sem servidores do Discord listados até a API.
- O `?passo=N` do protótipo (que preenchia um nome de exemplo) não foi portado.

## Painel do Mestre (`/campaign/[id]`)
- Só o mestre vê o Painel; jogadores continuam com a visão geral antiga (o design não tem visão de jogador para essa rota). O banner e as abas antigas somem para o mestre nessa rota (`CromoAntigo`).
- `/campaign/[id]/gm` redireciona para o Painel (decisão da nota 001).
- Datas da crônica no fuso de Brasília (`lib/tempo.ts`). Sessão sem nome = "Sessão N". Iniciar sem nome grava "Sessão N" (em romano) como no design.
- Atividade = últimas rolagens e inscrições (sem "caiu para X PV", "marcou ausência" ou resumos publicados, que não têm registro).
- Inscrição: "Experiência: Iniciante/Intermediário/Veterano" na linha de cima e como etiqueta; a mensagem é o texto da carta.
- Aceitar inscrição põe a pessoa no grupo como "Sem personagem".
- Tipos de NPC: Inimigo aparece como Vilão; Montaria/Servo/Outro aparecem como Neutro. NPC rápido grava Vilão/Aliado/Mercador/Familiar/Neutro.
- Vagas = `maxSlots` (6 quando vazio).
- Linha do bot: "Lembretes e rolagens no servidor do Discord da campanha" / "Nenhum servidor do Discord ligado à campanha" até haver servidor e canal.
- Fios soltos, agendamento, renomear, visibilidade das rolagens, código e arquivar chamam endpoints da fase da API.
- Os componentes antigos do `/gm` ficam no repositório até a tela Membros (que absorve "Criar ficha para @x").

## Personagens (`/personagens`)
- Regra de rolagem pelo sistema da ficha: World of Darkness → pool de d10 (dif. 6); atributo com dado d100 → percentual; o resto → d20 + modificador. A rolagem fica na tela (não vai para o log), como no design.
- Atributos mostrados: os 6 primeiros da ficha, com sigla de 3 letras ("Força" → FOR).
- Barra extra = primeira barra de recurso da campanha além da vida.
- PV ± grava na ficha (`PATCH /api/characters/[id]`) meio segundo depois do último clique.
- Aba Mestre: NPCs das campanhas em que você é mestre; o olho grava `isPublic`.
- Sem personagens: o painel lateral não aparece (o design não tem estado vazio).
- "Importar ficha" (`?importar=1`) abre o modal de importação atual até a tela Importar Ficha.

## Criar Personagem (`/personagens/novo`)
- Assistente de D&D 5e do design para qualquer campanha; os atributos são gravados pelo nome nos atributos do sistema da campanha (o `POST /api/characters` passou a aceitar `atributos`). O cartão do sistema mostra o sistema da campanha.
- "Sem campanha" não existe: a ficha pertence a uma participação na campanha. A lista mostra só as campanhas em que você ainda não tem ficha; vazia → "Entre numa campanha para criar um personagem."
- Antecedente, alinhamento e história viram campos de texto da ficha. O segredo não é gravado ainda (campo de texto apareceria na ficha pública).
- NPC: `POST /api/campaigns/[id]/npcs` com tipo, raça, classe, nível, PV, visibilidade e a história como descrição.
- Removidos: a lista antiga de personagens, os modais antigos de criar ficha e de criar/entrar em campanha.

## Ficha (`/personagens/[id]`)
- `[id]` aceita o id da participação (links antigos, bot) ou o id da ficha (telas novas).
- Só fichas de D&D 5e abrem a Ficha nova; as outras seguem com a ficha antiga até "Fichas por Sistema".
- Atributos, salvaguardas (`Salv. X`), perícias, CA, Velocidade e Percepção Passiva vêm dos atributos do D&D 5e do seed. O ponto de proficiência aparece quando o bônus gravado é maior que o modificador.
- Iniciativa = modificador de DES. Intuição passiva = 10 + bônus de Intuição.
- Ataques = armas da ficha (bônus e dano gravados; o dano rola pelo "XdY+Z").
- Espaços de magia: o primeiro círculo com espaços; gastar/recuperar grava (`spell-slots`).
- Destruição Divina e Cura pelas Mãos só para Paladino (reserva = 5 × nível). Dado de vida pela classe.
- PV grava na ficha; PV temporários, testes contra a morte, inspiração, dados de vida gastos e reserva de Cura pelas Mãos ficam só na tela.
- Magias, inventário, moedas, XP, traços e recursos de classe: listas vazias (sem tabela). XP escondido.
- Diário e "Juramentos e aliados" gravam como campos de texto da ficha.
- A rolagem fica na tela (toast), como no design.

## Explorar (`/explorar`)
- Mesas = campanhas com Taverna aberta (`isOpen`) em que você não está. Destaque = a atualizada mais recentemente; sem nenhuma, o destaque some.
- Vagas = jogadores / `maxSlots` (sem `maxSlots`, mostra uma vaga livre). "Iniciantes bem-vindos" = experiência mínima vazia, "none" ou "beginner". Tom = `contentTone` + `playStyle`.
- Filtro de sistema com os sistemas das mesas abertas.
- A carta vai inteira no `characterDesc` (mensagem + personagem + experiência + disponibilidade + Discord), pelo `POST /apply`. Erros da API (sem vagas, já é membro) aparecem na carta.
- "Com quem você vai?": suas fichas do mesmo sistema, "Criar depois do aceite" e "Personagem pré-pronto" (a escolha vai no texto da carta).
- As três regras da mesa do design valem para todas as mesas (regras da Taverna).
- Minhas cartas: suas inscrições com Aguardando/Aceita/Recusada.

## Sistemas (`/sistemas`)
- Estante = pré-definidos + sistemas de usuários (comunidade). "Personalizado" entra em Genérico. Ícone da lombada pela categoria (pena para homebrew seu).
- Dado da lombada: o do mapa dos pré-definidos ou o dado mais comum entre os atributos. "Mesas no Saga" = campanhas que usam o sistema.
- "Clonar e editar" cria a cópia (`POST /api/systems` com `copyFromSystemIds`) e abre a cópia em `/sistemas/[id]` (edição atual).
- Importar de outro sistema: só em sistema seu, pelo `POST /api/systems/[id]/import`; a mensagem usa a contagem do servidor.
- Removidos: a estante antiga e o modal antigo de criar sistema.

## Criar Sistema (`/sistemas/novo`)
- Começa em branco, com os seis atributos clássicos e "Pontos de vida" como ponto de partida (o design vem com um exemplo preenchido).
- Salvar cria o sistema e grava atributos e perícias como atributos da ficha (dado = dado base; rolar abaixo → d100; parada → d10). Sigla e mínimo–máximo vão na descrição do atributo.
- Rascunho fica no navegador.
- Mecânica, dificuldade, crítico, recursos, couro/ícone, visibilidade e as chaves de clonar/importar seguem no corpo para a fase da API. Hoje todo sistema de usuário aparece na comunidade.

## Perfil (`/perfil`)
- Nome de exibição, @usuário e avatar vêm do Discord. Estatísticas reais: sessões e horas das suas campanhas, dados rolados por você e vintes naturais (rolagem de d20 com um 20).
- Sistemas favoritos = os que mais aparecem nas suas campanhas. Títulos = "Cronista Iniciante" + "Mestre de <campanha>" para cada campanha que você mestra (até existir sistema de títulos).
- Salvar chama `PATCH /api/perfil` (fase da API); bio, título, moldura e avatar enviado só persistem com ela.
- Discord sempre conectado (é o login); "Sincronizar agora" chama `POST /api/perfil/sincronizar`. Servidores, Google, e-mail/senha, 2FA e dispositivos ficam vazios ou "—" até a API.
- Tema: Claro/Escuro/Sistema usam o mesmo tema do resto do app ("Sistema" aplica a preferência do aparelho na hora). Preferências de animação, sons, e-mails e resumo ficam no navegador.

## Mensagens (`/mensagens`)
- Conversas = canais das suas campanhas, sobre o chat da sessão (o único canal que existe hoje). Sem sessão ativa, mostra o registro da última sessão; enviar avisa "O canal abre para mensagens quando a sessão começa." na linha de digitação (o design não tem estado de erro).
- `/r XdY+Z` rola no servidor e entra no registro; texto comum vira mensagem de chat.
- Removidos da simulação do protótipo: respostas automáticas e "está escrevendo…". Diretas, sussurro selado, recado fixado e modo em personagem esperam a API (o modo muda só o visual do campo).
- Handouts do painel lateral = as duas imagens de handout mais recentes da campanha.
- Horários no fuso do navegador.

## Ficha Pública (`/ficha/[id]`, id da ficha)
- Mostra retrato, campanha, sistema, barras de recurso e até 6 atributos (os seis clássicos primeiro). Modificador só em sistema de fantasia; nos outros, o valor.
- Privada ou inexistente → "Esta ficha está selada". O dono vê a barra e o interruptor grava `isPublic`.
- Link curto = o endereço real da página.

## Importar Ficha (`/personagens?importar=1`)
- Modal por cima da galeria real (a página falsa atrás do modal e os arquivos de exemplo do protótipo não foram portados). Clique abre o seletor de arquivo; sem arrastar-e-soltar (o design também só tem clique).
- Lê com o `POST /api/characters/import` que já existe; os três passos de leitura animam enquanto a extração roda (mínimo de 2,7 s, como no design).
- "Sistema detectado" = o que a extração devolve ("Não identificado" sem pista); sem o selo "alta confiança" (a API não mede).
- "Nenhuma" campanha não cria: "Escolha uma campanha: por enquanto toda ficha vive numa campanha." A lista mostra as campanhas em que você ainda não tem ficha.
- Valores não lidos entram como 0. Removido: o modal antigo de importação.

## Membros (`/campaign/[id]/members`)
- Visão pelo seu papel na campanha (o seletor Mestre/Jogador do protótipo não aparece). O banner antigo some nessa rota.
- Presença pelo `lastSeenAt`: online < 60 s, "visto há…" (dourado) até 30 min, depois offline. A tela manda o sinal de presença e atualiza a lista a cada 20 s.
- PV (número e barra) só quando a campanha usa a barra de vida.
- "Criar ficha para @x" (duas etapas) cria a ficha pelo `POST /api/characters` com o modelo do sistema da campanha. Removidos os componentes antigos do `/gm` que o Painel e o Membros substituíram.
- Código de convite "—" até `inviteCode`.

## Sessão (`/campaign/[id]/sessions/[sessionId]`)
- Número = ordem da sessão na campanha. Título = nome da sessão, ou o primeiro "# título" do resumo, ou "Sessão N". Horários no fuso de Brasília.
- Resumo grava pela rota `.../summary` que já existe (o mestre edita; jogador só lê).
- Críticos = 1d20 com 20; "Na mesa" = quem rolou (ou a presença salva da sessão, o que for maior).
- Destaque = a maior rolagem da sessão; some se não houve rolagens.
- Rolagens privadas ainda não existem: todas aparecem como públicas, sem marcadores (TODO(api)).
- Banner antigo some nessa rota. Removido: o editor antigo de resumo.

## NPCs (`/campaign/[id]/npcs`)
- A seleção vai em `?npc=`. "Ficha completa" abre a ficha de NPC atual em `/npcs/[npcId]` (fica até "Fichas por Sistema"); o README pedia que essa rota abrisse a lista com o NPC selecionado.
- Pastas reais (criar, renomear inline, apagar com confirmação; os NPCs vão para "Sem pasta"). Mover para pasta grava `folderId`.
- Visível para um jogador = `isPublic` ou `NPCVisibility.canView`. Ligar/desligar um jogador num NPC público passa a valer por jogador. "Revelar a todos" liga `isPublic`; "Esconder de todos" desliga e zera as visibilidades.
- PV ±1/±5 grava no NPC. Atributos: até 6 (os clássicos primeiro), com modificador só em sistema de fantasia.
- Tipos sem cor própria no design (Inimigo → Vilão; Familiar, Servo e Outro → Neutro).
- Jogador recebe só os NPCs revelados para ele, sem pastas nem controles. Banner antigo some nessa rota.
- Removidos os controles antigos de NPC (pastas, botão de apagar, painel de atributos e o modal/ações antigos).

## Termos e Privacidade
- O Sumário rola até a seção (no design só destacava).
- Texto jurídico, vigência, versão e contato em `apps/web/src/lib/legal.ts` — preencher antes de publicar.
