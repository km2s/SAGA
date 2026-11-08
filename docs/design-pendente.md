# Design pendente

O que ainda falta desenhar para o redesign cobrir o site inteiro. Levantado em 2026-11-08
a partir das telas antigas que continuam no ar e dos estados que os `.dc.html` não têm.

## 1. Fichas por Sistema: o conteúdo das abas de seção (o maior)

A moldura já está desenhada (atributos, trilhas, pílulas, regra de rolagem). Falta o que
vai **dentro** de cada aba de seção. Hoje as 27 fichas antigas usam estas peças; basta
desenhar cada peça uma vez, e eu ligo cada sistema aos campos reais depois.

**Peças comuns (todas as fichas)**
- Campo de texto curto e campo de texto longo, editáveis, com rótulo.
- Armas / ataques: tabela com nome, bônus, dano, tipo, alcance e propriedades; adicionar e remover.
- Lista de atributos extras do sistema (os que não são os principais), com o valor e a rolagem.

**Bolinhas (Vampiro V5 e V20, Lobisomem, Mago A Ascensão e O Despertar, Caçador, Changeling, Demônio, Geist)**
- Habilidades em três colunas (Físicas, Sociais, Mentais) com bolinhas de 0 a 5.
- Lista nomeada com bolinhas, com adicionar/remover: Disciplinas, Antecedentes, Dons, Esferas, Arcanos, Contratos, Embeds.
- Trilha de saúde em caixas com três estados por caixa (vazia, superficial, agravado). No V20, os níveis Escoriado → Incapacitado com a penalidade de cada um.
- Caixas de recurso (Raiva, Gnose, Glamour, Força de Vontade gasta, Pontos de Sangue) e a trilha de Fome (V5).
- V5: Ressonância (seletor de tipo) e notas de caça; Convicções, Tocadores e Preceitos (texto longo).

**d20 (D&D 3.5, Pathfinder 1e e 2e, Tormenta20, Starfinder, 13th Age)**
- Espaços de magia por nível (total e usados) e lista de magias por nível com custo.
- Pathfinder 2e: seletor de proficiência por perícia (Destreinado, Treinado, Especialista, Mestre, Lendário).
- 13th Age: relações com Ícones (nome + dados), dado de escalada, recuperações.
- Starfinder: barras de Vigor, Vida e Resolve.

**Porcentagem (Call of Cthulhu 7e, Delta Green, Mothership)**
- Lista de perícias percentuais, com ½ e ⅕ no CoC.
- Delta Green: vínculos (nome + pontuação), transtornos, marcas de "adaptado à violência / ao desamparo".
- Mothership: salvaguardas (Sanidade, Medo, Corpo), estresse e pânico.

**2d6 e jornadas (Dungeon World, Ironsworn)**
- Dungeon World: moves da classe, vínculos.
- Ironsworn: juras (nível da jura + trilha de progresso de 10 caixas com marcas), assets, debilidades (marcar/desmarcar).

**Narrativos (Fate Core, Blades in the Dark)**
- Fate: aspectos, perícias em pirâmide, lista de façanhas, caixas de estresse, consequências (leve, moderada, grave, com texto).
- Blades: ações com bolinhas por atributo e XP por atributo, playbook e habilidades especiais (lista), moedas e cofre (4 e 40), carga e armadura (marcar), traumas (lista).

**Paradas e monitores (Shadowrun 6e, Cyberpunk Red, Star Wars)**
- Shadowrun: monitores físico e de atordoamento em caixas, com a penalidade a cada 3.
- Cyberpunk Red: perícias numéricas por atributo, cyberware, humanidade.
- Star Wars: limiares de ferimentos e tensão, perícias com a parada de dados.

**Passos e pontos (Savage Worlds, GURPS 4e)**
- Savage: perícias com dado (d4 a d12), vantagens e complicações, ferimentos e fadiga.
- GURPS: vantagens e desvantagens com custo em pontos, perícias com NH, defesas ativas.

## 2. Ficha completa de NPC (`/campaign/[id]/npcs/[npcId]`)
Ainda é a tela antiga. Provavelmente a mesma moldura da Fichas por Sistema, na versão de NPC (sem dono, só o mestre edita).

## 3. Telas antigas que continuam no ar
- **Visão do jogador na campanha** (`/campaign/[id]`): o Painel do Mestre é só do mestre; o jogador ainda vê a visão geral antiga.
- **Notas da campanha** (`/campaign/[id]/notes`): lista e criação de notas, com visibilidade (Campanha / Privada / Só o Mestre).
- **Lista de sessões** (`/campaign/[id]/sessions`): o mestre tem a aba Sessões no Painel, mas o jogador não tem onde ver as sessões passadas.
- **Edição de sistema** (`/sistemas/[id]`): aberta por "Clonar e editar" e pelo modelo de ficha no Painel; edita nome, descrição e atributos.

## 4. Estados que os designs não têm
- **Mesa sem sessão ao vivo** (para o mestre e para o jogador). Hoje só uma frase na dica do mapa.
- **Mesa no celular**: o design é de 1440 px; a Mesa antiga funcionava com toque e pinça.
- **Personagens sem nenhum personagem**: o painel lateral some; falta o estado vazio.
- **Mensagens: erro ao enviar.**
- **Página 404 e página de erro geral**: hoje caem nas do Next.
- **Tutorial guiado da Mesa** (o antigo destaque passo a passo), se ainda fizer sentido, ou um passo de Mesa nos Primeiros Passos.
