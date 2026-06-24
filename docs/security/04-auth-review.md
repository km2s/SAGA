# Revisão de Autenticação — Saga RPG
**Data:** 2026-06-24  
**Versão:** 1.0

---

## 1. Visão Geral da Arquitetura de Autenticação

O Saga RPG usa **NextAuth.js v4** com **Discord OAuth 2.0** como único provedor de identidade. Não há autenticação por senha. A sessão é mantida via **JWT** (não armazenado em banco de dados).

```
Usuário → Login → Discord OAuth 2.0 → Callback NextAuth
    → signIn callback (upsert no banco)
    → jwt callback (enriquece token)
    → session callback (expõe ao cliente)
    → Cookie HttpOnly com JWT assinado
```

---

## 2. Configuração NextAuth.js

**Arquivo:** `apps/web/src/lib/auth.ts`

```typescript
export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    signIn, jwt, session
  },
}
```

---

## 3. Análise por Componente

### 3.1 Callback `signIn`

```typescript
async signIn({ profile }) {
  const p = profile as DiscordProfile | undefined
  if (!p?.id) return false
  
  const avatarUrl = p.avatar
    ? `https://cdn.discordapp.com/avatars/${p.id}/${p.avatar}.png`
    : null
  
  await prisma.user.upsert({
    where: { discordId: p.id },
    update: { username: p.username, avatar: avatarUrl },
    create: { discordId: p.id, username: p.username, avatar: avatarUrl },
  })
  return true
}
```

**✅ Correto:**
- Verifica `p?.id` antes de prosseguir
- Usa `upsert` para criar ou atualizar de forma atômica
- Não armazena email ou dados desnecessários

**⚠️ Riscos:**

**AUTH-01:** O URL do avatar é construído com `p.id` e `p.avatar` vindos diretamente do Discord OAuth. Se o Discord retornar um hash de avatar com caracteres especiais (atualmente impossível pelo formato do Discord, mas defensivamente inadequado), o URL poderia ser manipulado.

**AUTH-02:** Não há verificação de domínio/guild específica. Qualquer usuário com conta Discord pode criar uma conta no Saga. Se o projeto for privado, deveria verificar membership em um servidor Discord específico.

---

### 3.2 Callback `jwt`

```typescript
async jwt({ token, profile }) {
  const p = profile as DiscordProfile | undefined
  if (p) {
    token.discordId = p.id
    token.username = p.username
    token.avatar = p.avatar
      ? `https://cdn.discordapp.com/avatars/${p.id}/${p.avatar}.png`
      : undefined
  }
  delete token.email
  delete token.name
  return token
}
```

**✅ Correto:**
- Remove `email` e `name` do token (minimização de dados)
- Enriquece apenas no fluxo de login (quando `profile` está presente)
- Não armazena dados sensíveis no JWT

**⚠️ Riscos:**

**AUTH-03:** O token JWT não tem **expiração explícita** configurada. O NextAuth.js usa padrão de 30 dias. Para uma plataforma de RPG (uso eventual), sessões de 30 dias são longas. Se um token for comprometido, o atacante tem acesso por até 30 dias.

**AUTH-04:** O `username` do Discord é armazenado no JWT e nunca é atualizado após o login inicial. Se o usuário mudar seu username no Discord, o token antigo mantém o username desatualizado até expirar.

---

### 3.3 Callback `session`

```typescript
async session({ session, token }) {
  session.user.discordId = token.discordId as string
  session.user.username = token.username as string
  if (token.avatar) session.user.image = token.avatar as string
  return session
}
```

**✅ Correto:**
- Expõe apenas os dados necessários para o cliente
- Usa `as string` (poderia ser mais seguro com null checks)

**⚠️ Riscos:**

**AUTH-05:** Se `token.discordId` for `undefined` (ex: token antigo antes da migração), o cast `as string` resultará em `undefined` sendo armazenado como `session.user.discordId`. Endpoints que confiam em `session.user.discordId` sem null check podem ter comportamento inesperado.

---

### 3.4 Middleware de Proteção de Rotas

```typescript
// apps/web/src/middleware.ts
export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/dashboard/:path*', '/campaign/:path*'],
}
```

**✅ Correto:**
- Protege rotas do dashboard e de campanha
- Usa o middleware padrão do NextAuth (testado e mantido)

**⚠️ Riscos:**

**AUTH-06:** O matcher não inclui rotas como `/login` com redirect automático. Um usuário já autenticado pode acessar `/login` novamente — embora isso seja UX, não um risco de segurança direto.

**AUTH-07:** As rotas de API (`/api/*`) **não** estão protegidas pelo middleware — dependem de `getServerSession()` individualmente em cada handler. Isso é correto para APIs, mas significa que qualquer nova rota esquecida de verificar sessão ficará pública.

---

### 3.5 NextAuth API Route

```typescript
// apps/web/src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

**✅ Correto:** Implementação padrão, sem customizações problemáticas.

---

## 4. Análise de Cookies e Sessão

O NextAuth.js em produção (NEXTAUTH_URL com HTTPS) configura automaticamente:

| Cookie | HttpOnly | Secure | SameSite | Esperado |
|---|---|---|---|---|
| `next-auth.session-token` | ✅ | ✅ (produção) | `lax` | `strict` recomendado |
| `next-auth.csrf-token` | ✅ | ✅ (produção) | `lax` | OK |
| `next-auth.callback-url` | ❌ | ✅ | `lax` | Minimizar exposição |

**AUTH-08:** O `SameSite=Lax` permite que cookies sejam enviados em navegações de nível superior de outros sites (ex: clique em link). `SameSite=Strict` seria mais seguro, impedindo CSRF via links externos.

---

## 5. Análise de CSRF

O NextAuth.js v4 implementa proteção CSRF via:
1. **CSRF Token duplo** nos formulários de login
2. **SameSite cookies** (proteção parcial com `Lax`)

**✅ Para fluxos de login:** Protegido.

**⚠️ Para endpoints de API customizados:** Os endpoints de API (`/api/campaigns/*`, `/api/characters/*`) não implementam CSRF tokens explícitos. A proteção depende de:
- `SameSite=Lax` cookies (parcial)
- `Content-Type: application/json` (browsers não enviam JSON cross-origin sem CORS)
- CORS policy do Next.js (por padrão, permite only-same-origin para credentials)

**AUTH-09:** A ausência de CSRF explícito em endpoints de API que modificam dados (`POST`, `PATCH`, `DELETE`) deixa uma lacuna de segurança teórica se um atacante controlar um subdomínio (por CORS bypass).

---

## 6. Análise de JWT

**Algoritmo:** HS256 (HMAC-SHA256, padrão do NextAuth v4)  
**Chave:** `NEXTAUTH_SECRET` (env var)

**✅ Correto:**
- HS256 é adequado para este caso (single-server)
- `NEXTAUTH_SECRET` protege contra falsificação de token

**⚠️ Riscos:**

**AUTH-10:** Se `NEXTAUTH_SECRET` for curto ou previsível:
```bash
# Fraco (inseguro):
NEXTAUTH_SECRET=secret
NEXTAUTH_SECRET=mysecret123

# Correto (32+ bytes aleatórios):
NEXTAUTH_SECRET=$(openssl rand -base64 32)
```

**AUTH-11:** Sem expiração explícita, tokens comprometidos têm vida longa:
```typescript
// Adicionar ao authOptions:
session: {
  strategy: 'jwt',
  maxAge: 7 * 24 * 60 * 60, // 7 dias em vez de 30
}
```

---

## 7. Análise de OAuth 2.0 (Discord)

**Scopes solicitados:** `identify` (padrão do NextAuth DiscordProvider)

**✅ Correto:**
- Scope mínimo necessário
- Não solicita permissões de email, guilds, etc.

**⚠️ Riscos:**

**AUTH-12:** O `DISCORD_CLIENT_SECRET` está em variável de ambiente. Em produção no Vercel, deve estar nas env vars do projeto (não no código). Verificar se `.env` não está commitado.

**AUTH-13:** Sem verificação de `state` customizado além do que o NextAuth implementa. O NextAuth gerencia isso, mas é importante que a `NEXTAUTH_URL` seja configurada corretamente para evitar open redirects no callback.

---

## 8. Verificação de Identidade nos Endpoints

O padrão usado nos endpoints para identificar o usuário:

```typescript
const session = await getServerSession(authOptions)
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// Buscar usuário pelo discordId do token
const user = await prisma.user.findUnique({
  where: { discordId: session.user.discordId },
})
```

**✅ Correto:** Usa `discordId` do JWT assinado (não de parâmetros de URL ou body)

**⚠️ Risco (AUTH-14):** Se o usuário for deletado do banco mas o JWT ainda for válido, `user` será `null`. Alguns endpoints verificam isso, outros não:

```typescript
// Endpoints que verificam:
if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

// Endpoints que NÃO verificam (usam findFirst direto):
const member = await prisma.campaignMember.findFirst({
  where: { campaignId: params.id, user: { discordId: session.user.discordId } }
})
// Se o user foi deletado, member será null — mas a mensagem de erro pode ser confusa
```

---

## 9. Recomendações

### Prioridade Alta

1. **Reduzir expiração do JWT para 7 dias:**
```typescript
// apps/web/src/lib/auth.ts
session: {
  strategy: 'jwt',
  maxAge: 7 * 24 * 60 * 60,
},
```

2. **Validar entropia do NEXTAUTH_SECRET:**
```typescript
// apps/web/src/lib/auth.ts — adicionar no início
if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {
  throw new Error('NEXTAUTH_SECRET deve ter pelo menos 32 caracteres')
}
```

3. **Adicionar SameSite=Strict:**
```typescript
// apps/web/src/lib/auth.ts
cookies: {
  sessionToken: {
    options: {
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
    },
  },
},
```

### Prioridade Média

4. **Invalidar sessão em `signIn` para tokens desatualizados:**
Verificar se `token.discordId` corresponde ao `profile.id` atual para detectar mudanças de conta.

5. **Documentar requisitos de variáveis de ambiente:**
Criar um script de validação de variáveis de ambiente no startup.

### Prioridade Baixa

6. **Considerar rotação de NEXTAUTH_SECRET** periodicamente (implica invalidação de todas as sessões ativas).

7. **Avaliar migração para Auth.js v5** (próxima versão major do NextAuth) quando estiver estável.

---

## 10. Resumo de Achados

| ID | Descrição | Severidade | Status |
|---|---|---|---|
| AUTH-01 | Avatar URL construído com dados OAuth | Baixa | Risco aceitável |
| AUTH-02 | Sem restrição de guild/servidor Discord | Baixa | Design decision |
| AUTH-03 | JWT sem expiração explícita (padrão 30 dias) | Alta | Corrigir |
| AUTH-04 | Username desatualizado entre logins | Baixa | Aceitável |
| AUTH-05 | Cast `as string` sem null check | Baixa | Corrigir |
| AUTH-06 | Sem redirect de /login para autenticados | Mínima | Opcional |
| AUTH-07 | APIs dependem de verificação individual | Médio | Risco de omissão |
| AUTH-08 | SameSite=Lax (deveria ser Strict) | Médio | Corrigir |
| AUTH-09 | Sem CSRF token em APIs customizadas | Médio | Corrigir |
| AUTH-10 | NEXTAUTH_SECRET sem validação de entropia | Alta | Corrigir |
| AUTH-11 | JWT de 30 dias — acesso prolongado se comprometido | Alta | Corrigir |
| AUTH-12 | DISCORD_CLIENT_SECRET em variável de ambiente | Médio | Verificar .gitignore |
| AUTH-13 | NEXTAUTH_URL deve ser configurado em produção | Médio | Verificar |
| AUTH-14 | User deletado com JWT válido | Baixa | Aceitável |
