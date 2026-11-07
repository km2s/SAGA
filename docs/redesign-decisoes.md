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

## Termos e Privacidade
- O Sumário rola até a seção (no design só destacava).
- Texto jurídico, vigência, versão e contato em `apps/web/src/lib/legal.ts` — preencher antes de publicar.
