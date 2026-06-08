import type { NextAuthOptions } from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'
import { prisma } from 'database'

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
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
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
      return token
    },
    async session({ session, token }) {
      session.user.discordId = token.discordId as string
      session.user.username = token.username as string
      if (token.avatar) session.user.image = token.avatar as string
      return session
    },
  },
}
