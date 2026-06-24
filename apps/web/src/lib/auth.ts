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
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
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
