import type { NextAuthOptions } from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'
import { prisma } from 'database'
import { cookies, headers } from 'next/headers'
import { COOKIE_2FA, bilhete, lerBilhete } from '@/lib/dois-fatores'
import { localDe, nomeDispositivo } from '@/lib/dispositivos'

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
  global_name?: string | null
  discriminator: string
  avatar: string | null
  email?: string
}

// Em produção (HTTPS) o cookie de sessão usa o prefixo __Secure-, igual ao padrão
// do NextAuth e ao que o getToken do middleware espera. Sem isso, o middleware não
// encontrava o token e devolvia o usuário ao /login (loop de login após o OAuth).
export const USE_SECURE_COOKIES = process.env.NODE_ENV === 'production'
export const SESSION_COOKIE_NAME = `${USE_SECURE_COOKIES ? '__Secure-' : ''}next-auth.session-token`

/**
 * Registro do dispositivo da sessão. Sem `dispId` (login novo ou sessão de antes da
 * Segurança) cria um; com ele, atualiza o "visto em". `false` = sessão encerrada.
 */
async function dispositivoDo(discordId: string, dispId: string | null): Promise<string | false | null> {
  try {
    if (dispId) {
      const d = await prisma.dispositivo.findUnique({ where: { id: dispId }, select: { encerradoEm: true, vistoEm: true } })
      if (!d || d.encerradoEm) return false
      // Em componente de servidor o cookie não é regravado: escreve no máximo a cada 5 min.
      if (Date.now() - d.vistoEm.getTime() > 5 * 60_000) await prisma.dispositivo.update({ where: { id: dispId }, data: { vistoEm: new Date() } })
      return dispId
    }
    const u = await prisma.user.findUnique({ where: { discordId }, select: { id: true } })
    if (!u) return null
    let h: { get(n: string): string | null } | null = null
    try { h = headers() } catch { /* fora de uma requisição */ }
    const d = await prisma.dispositivo.create({ data: { userId: u.id, nome: nomeDispositivo(h?.get('user-agent') ?? ''), local: h ? localDe(h) : null } })
    return d.id
  } catch (e) {
    console.error('[auth] dispositivo:', e instanceof Error ? e.message : e)
    return null
  }
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
      // Verificação em duas etapas: sem a liberação de /verificar, o login não cria sessão
      // (vai para /verificar com um bilhete assinado de 5 minutos).
      const dois = await prisma.user.findUnique({ where: { discordId: p.id }, select: { totpAtivoEm: true } }).catch(() => null)
      if (dois?.totpAtivoEm) {
        const jar = cookies()
        if (lerBilhete(jar.get(COOKIE_2FA)?.value, 'ok') !== p.id) return `/verificar?t=${encodeURIComponent(bilhete(p.id, 'login', 5))}`
        try { jar.delete(COOKIE_2FA) } catch { /* só leitura fora do route handler */ }
      }
      try {
        // Foto enviada no Perfil ("Sincronizar foto" desligado): o login não troca pela do Discord.
        const atual = await prisma.user.findUnique({ where: { discordId: p.id }, select: { prefsJson: true } })
        const fotoPropria = /"avatar":0/.test(atual?.prefsJson ?? '')
        await prisma.user.upsert({
          where: { discordId: p.id },
          update: { username: p.username, ...(fotoPropria ? {} : { avatar: avatarUrl }) },
          create: { discordId: p.id, username: p.username, avatar: avatarUrl },
        })
      } catch (e) {
        // Aparece nos logs da Vercel; a tela de login mostra "AccessDenied".
        console.error('[auth] falha ao gravar o usuário no login:', e instanceof Error ? e.message : e)
        return false
      }
      return true
    },
    async jwt({ token, profile }) {
      const p = profile as DiscordProfile | undefined
      if (p) {
        token.discordId = p.id
        token.username = p.username
        // Nome de exibição do Discord ("Kael"); o username fica no @handle.
        token.displayName = p.global_name || p.username
        token.avatar = p.avatar
          ? `https://cdn.discordapp.com/avatars/${p.id}/${p.avatar}.png`
          : undefined
      }
      // Remove campos sensíveis que o NextAuth copia automaticamente do perfil OAuth
      delete token.email
      delete token.name
      // Dispositivos (Segurança): cada login vira um registro; "Encerrar" derruba esta
      // sessão. Confere no banco no máximo a cada minuto.
      if (token.discordId && (p || !token.dispId || Date.now() - ((token.dispVisto as number | undefined) ?? 0) > 60_000)) {
        const id = await dispositivoDo(token.discordId as string, p ? null : (token.dispId as string | undefined) ?? null)
        // Sessão encerrada em outro lugar: o erro faz o NextAuth apagar o cookie.
        if (id === false) throw new Error('Sessão encerrada em outro dispositivo')
        if (id) { token.dispId = id; token.dispVisto = Date.now() }
      }
      return token
    },
    async session({ session, token }) {
      if (token.discordId) session.user.discordId = token.discordId as string
      if (token.username) session.user.username = token.username as string
      session.user.displayName = (token.displayName as string | undefined) ?? session.user.username
      if (token.avatar) session.user.image = token.avatar as string
      return session
    },
  },
}
