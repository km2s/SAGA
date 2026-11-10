import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'
import { perfilDiscord } from '@/lib/discord-notify'
import { applyRateLimit } from '@/lib/rate-limit'

/** "Sincronizar agora": usuário, nome e avatar de novo a partir do Discord (pelo token do bot). */
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rl = applyRateLimit(`perfil-sync:${session.user.discordId}`, { max: 6, windowMs: 60 * 60 * 1000 })
  if (rl) return rl
  const p = await perfilDiscord(session.user.discordId)
  if (!p) return NextResponse.json({ error: 'O Discord não respondeu agora' }, { status: 503 })
  const atual = await prisma.user.findUnique({ where: { discordId: session.user.discordId }, select: { prefsJson: true } }).catch(() => null)
  let prefs: Record<string, number> = {}
  try { prefs = JSON.parse(atual?.prefsJson ?? '{}') as Record<string, number> } catch { /* padrão */ }
  await prisma.user.update({
    where: { discordId: session.user.discordId },
    data: {
      username: p.username,
      ...(prefs.avatar !== 0 ? { avatar: p.avatar } : {}),
      ...(prefs.nome !== 0 && p.nome ? { nomeExibido: p.nome } : {}),
    },
  })
  return NextResponse.json({ ok: true })
}
