# Saga RPG

Plataforma web para gerenciamento de campanhas de RPG de mesa, com bot para Discord integrado.

## Visão Geral

O Saga é um sistema completo para mestres e jogadores de RPG. Reúne fichas de personagem, mesa virtual, gerenciamento de sessões, NPCs, handouts e muito mais — tudo sincronizado em tempo real durante as sessões.

## Funcionalidades

### Campanhas
- Criar campanhas com nome, sistema, tema e descrição
- Escolher tipo: **Campanha** (múltiplas sessões) ou **One-Shot** (sessão única)
- Entrar em campanhas existentes via código de convite
- **Campanhas Abertas**: tornar uma campanha pública para que jogadores encontrem e se inscrevam via página `/explorar`
- Painel do Mestre com controle completo da campanha

### Fichas de Personagem
Suporte a múltiplos sistemas de RPG com abas específicas por categoria:

| Categoria | Sistemas |
|-----------|----------|
| Fantasia (D&D 5e) | Atributos, combate, magias, habilidades |
| World of Darkness (VtM V20, etc.) | Disciplinas, antecedentes, humanidade |
| Horror (Call of Cthulhu, etc.) | Sanidade, perícias |
| Sci-Fi / Cyberpunk | Atributos, implantes |
| Genérico / Personalizado | Atributos livres |

- Todos os sistemas suportam **Habilidades Criáveis** (Fúria Bárbara, Ataque Furtivo, etc.)
- Campos de texto livres por sistema
- Edição de HP e HP máximo diretamente na ficha
- Fichas de NPC editáveis pelo Mestre

### Mesa Virtual
- **Tokens**: arrastar e soltar no mapa, imagem customizável, iniciais, barra de HP
- **Controle de movimento por Live Mode**: apenas jogadores com permissão ativa podem mover tokens; o Mestre pode conceder controle de tokens extras por jogador
- **Mapa de fundo**: imagem configurável por URL
- **Névoa de guerra** (ferramenta de pintura)
- **Iniciativa**: tracker com ordem de turno, HP por token
- **Pings**: marcadores visuais visíveis para todos os jogadores em tempo real
- **Chat da sessão**: mensagens de texto e log de rolagens de dado
- **Música Ambiente**: presets (taverna, batalha, floresta…) ou URL do YouTube
- **Handouts**: compartilhamento de imagens e textos pelo Mestre

### Sistema Ao Vivo
- Mestre ativa ou desativa modo ao vivo por jogador
- Tokens sincronizados via polling (5 segundos)
- Movimentos, pings e chat visíveis para todos em tempo real
- Permissões granulares: Mestre define quais tokens extras cada jogador pode mover

### Sessões
- Iniciar e encerrar sessões com registro de data/hora
- Log de rolagens por sessão
- Resumo automático da sessão
- Histórico de sessões anteriores

### NPCs
- Criação com tipo (aliado, neutro, inimigo), raça, classe, nível, HP
- Fichas completas com atributos e campos de texto
- Controle de visibilidade por jogador
- Vinculação a personagem de jogador (para NPCs aliados controlados)

### Notas
- Notas privadas do mestre, compartilhadas com a campanha ou só com o GM
- Editor livre por sessão

### Rolagem de Dados
- Expressões: `1d20`, `2d6+3`, `d100`, etc.
- Suporte a modificadores
- Rolagem por atributo da ficha diretamente no chat
- Destaque especial para críticos e falhas críticas

### Bot Discord
- Comandos de barra integrados ao servidor Discord
- Rolagem de dados, consulta de fichas, informações de campanha

---

## Stack Técnica

| Camada | Tecnologia |
|--------|------------|
| Monorepo | pnpm workspaces |
| Frontend | Next.js 14 (App Router), TailwindCSS |
| Backend | Next.js API Routes |
| Banco de Dados | PostgreSQL via Supabase |
| ORM | Prisma 5 |
| Auth | NextAuth.js + Discord OAuth |
| Bot Discord | Discord.js |
| Deploy | Vercel (web) |

---

## Estrutura do Monorepo

```
rpg-bot/
├── apps/
│   ├── web/          # Aplicação Next.js (frontend + API)
│   └── bot/          # Bot Discord (Discord.js)
└── packages/
    └── database/     # Schema Prisma e cliente compartilhado
```

---

## Configuração Local

### Pré-requisitos
- Node.js 18+
- pnpm 8+
- Conta Supabase (PostgreSQL)
- Aplicação Discord OAuth configurada

### Variáveis de Ambiente

Crie `apps/web/.env.local`:
```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
DISCORD_BOT_TOKEN=...   # Opcional: para notificações de inscrição
```

### Instalação

```bash
# Instalar dependências
pnpm install

# Aplicar migrations
pnpm --filter database exec prisma migrate deploy

# Gerar cliente Prisma
pnpm --filter database exec prisma generate

# Iniciar em desenvolvimento
pnpm --filter web dev
```

---

## Migrations

Sempre usar o filtro correto para rodar migrations (evita instalar versão errada do Prisma):

```bash
pnpm --filter database exec prisma migrate deploy
pnpm --filter database exec prisma generate
```

---

## Licença

Projeto privado. Todos os direitos reservados.
