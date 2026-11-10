import { getServerSession } from 'next-auth'
import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from 'database'
import { SESSION_COOKIE_NAME, USE_SECURE_COOKIES, authOptions } from '@/lib/auth'
import { withNoCache } from '@/lib/no-cache'

async function contexto(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return null
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET, cookieName: SESSION_COOKIE_NAME, secureCookie: USE_SECURE_COOKIES })
  const u = await prisma.user.findUnique({ where: { discordId: session.user.discordId }, select: { id: true } }).catch(() => null)
  return u ? { userId: u.id, atual: (token?.dispId as string | undefined) ?? null } : null
}

/** Sessões abertas (Segurança › Dispositivos). */
export async function GET(req: NextRequest) {
  const c = await contexto(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ds = await prisma.dispositivo.findMany({ where: { userId: c.userId, encerradoEm: null }, orderBy: { vistoEm: 'desc' }, take: 30 })
  return withNoCache(NextResponse.json(ds.map(d => ({ id: d.id, nome: d.nome, local: d.local, vistoEm: d.vistoEm.toISOString(), atual: d.id === c.atual }))))
}

/** DELETE { id } encerra uma sessão; { outras: true } encerra todas menos esta. */
export async function DELETE(req: NextRequest) {
  const c = await contexto(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({})) as { id?: string; outras?: boolean }
  const agora = new Date()
  if (b.outras) {
    const r = await prisma.dispositivo.updateMany({ where: { userId: c.userId, encerradoEm: null, ...(c.atual ? { id: { not: c.atual } } : {}) }, data: { encerradoEm: agora } })
    return NextResponse.json({ ok: true, encerradas: r.count })
  }
  if (!b.id || b.id === c.atual) return NextResponse.json({ error: 'Para sair deste dispositivo, use Sair' }, { status: 400 })
  await prisma.dispositivo.updateMany({ where: { id: b.id, userId: c.userId }, data: { encerradoEm: agora } })
  return NextResponse.json({ ok: true })
}
