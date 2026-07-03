import type { NextAuthOptions } from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'
import { prisma } from 'database'

// Valida em startup que o secret tem entropia mínima em produção
if (process.env.NODE_ENV === 'production') {
  const secret = process.env.NEXTAUTH_SECRET ?? ''
  if (secret.length < 32) {
    throw new Error(
      'NEXTAUTH_SECRET deve ter pelo menos 32 caracteres. Gere um com: openssl rand -base64 32',
    )
  }
}

interface DiscordProfile {
  id: string
  username: string
  discriminator: string
  avatar: string | null
  email?: string
}

// Em produção (HTTPS) o cookie de sessão usa o prefixo __Secure-, igual ao padrão
// do NextAuth e ao que o getToken do middleware espera. Sem isso, o middleware não
// encontrava o token e devolvia o usuário ao /login (loop de login após o OAuth).
export const USE_SECURE_COOKIES = process.env.NODE_ENV === 'production'
export const SESSION_COOKIE_NAME = `${USE_SECURE_COOKIES ? '__Secure-' : ''}next-auth.session-token`

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 dias em vez do padrão de 30
  },
  pages: { signIn: '/login' },
  cookies: {
    sessionToken: {
      name: SESSION_COOKIE_NAME,
      options: {
        httpOnly: true,
        // 'lax' (não 'strict'): o cookie precisa acompanhar o redirect de volta do
        // Discord para a sessão ser reconhecida na primeira carga do /dashboard.
        sameSite: 'lax',
        path: '/',
        secure: USE_SECURE_COOKIES,
      },
    },
  },
  callbacks: {
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
    },
    async jwt({ token, profile }) {
      const p = profile as DiscordProfile | undefined
      if (p) {
        token.discordId = p.id
        token.username = p.username
        token.avatar = p.avatar
          ? `https://cdn.discordapp.com/avatars/${p.id}/${p.avatar}.png`
          : undefined
      }
      // Remove campos sensíveis que o NextAuth copia automaticamente do perfil OAuth
      delete token.email
      delete token.name
      return token
    },
    async session({ session, token }) {
      if (token.discordId) session.user.discordId = token.discordId as string
      if (token.username) session.user.username = token.username as string
      if (token.avatar) session.user.image = token.avatar as string
      return session
    },
  },
}
