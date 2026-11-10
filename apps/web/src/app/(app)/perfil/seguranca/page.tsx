import { getServerSession } from 'next-auth'
import { getToken } from 'next-auth/jwt'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from 'database'
import { SESSION_COOKIE_NAME, USE_SECURE_COOKIES, authOptions } from '@/lib/auth'
import { Seguranca } from '@/components/screens/seguranca/Seguranca'

export default async function SegurancaPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const u = await prisma.user.findUnique({ where: { discordId: session.user.discordId }, select: { id: true, totpAtivoEm: true } }).catch(() => null)
  if (!u) redirect('/login')
  // "Este dispositivo": o id do dispositivo vem no token da sessão.
  const req = { headers: Object.fromEntries(headers()), cookies: Object.fromEntries(cookies().getAll().map(c => [c.name, c.value])) }
  const token = await getToken({ req: req as never, secret: process.env.NEXTAUTH_SECRET, cookieName: SESSION_COOKIE_NAME, secureCookie: USE_SECURE_COOKIES }).catch(() => null)
  const atual = (token?.dispId as string | undefined) ?? null
  const ds = await prisma.dispositivo.findMany({ where: { userId: u.id, encerradoEm: null }, orderBy: { vistoEm: 'desc' }, take: 30 }).catch(() => [])
  return (
    <Seguranca dados={{
      ativo: !!u.totpAtivoEm, desde: u.totpAtivoEm?.toISOString() ?? null,
      dispositivos: ds.map(d => ({ id: d.id, nome: d.nome, local: d.local, vistoEm: d.vistoEm.toISOString(), atual: d.id === atual })).sort((a, b) => Number(b.atual) - Number(a.atual)),
    }} />
  )
}
