import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'
import { perfilDiscord } from '@/lib/discord-notify'
import { apagarSeNosso } from '@/lib/storage'

const MOLDURAS = ['Ouro', 'Cera', 'Ferro', 'Sangue']
const PREFS = ['avatar', 'nome', 'dm', 'rolls'] as const

/**
 * SAGA Perfil: nome exibido, bio, título, moldura e preferências do Discord.
 * O usuário (@) é o do Discord e volta a cada login, por isso não muda aqui.
 */
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({})) as { nome?: string; bio?: string; titulo?: string; moldura?: string; discord?: Record<string, unknown>; avatar?: string }
  const data: Record<string, unknown> = {}
  if (typeof b.nome === 'string') data.nomeExibido = b.nome.trim().slice(0, 40) || null
  if (typeof b.bio === 'string') data.bio = b.bio.trim().slice(0, 240) || null
  if (typeof b.titulo === 'string') data.titulo = b.titulo.trim().slice(0, 80) || null
  if (typeof b.moldura === 'string' && MOLDURAS.includes(b.moldura)) data.moldura = b.moldura
  if (b.discord && typeof b.discord === 'object') {
    // Junta com o resto de prefsJson (o progresso do tour mora lá também).
    const atual = await prisma.user.findUnique({ where: { discordId: session.user.discordId }, select: { prefsJson: true } }).catch(() => null)
    let base: Record<string, unknown> = {}
    try { base = JSON.parse(atual?.prefsJson ?? '{}') as Record<string, unknown> } catch { /* vazio */ }
    data.prefsJson = JSON.stringify({ ...base, ...Object.fromEntries(PREFS.map(k => [k, b.discord![k] ? 1 : 0])) })
  }
  // Foto: 'discord' volta à do Discord; 'nenhuma' tira; uma URL do bucket vira a foto própria.
  if ('avatar' in b) {
    const atual = await prisma.user.findUnique({ where: { discordId: session.user.discordId }, select: { avatar: true, prefsJson: true } }).catch(() => null)
    let prefs: Record<string, unknown> = {}
    try { prefs = JSON.parse(atual?.prefsJson ?? '{}') as Record<string, unknown> } catch { /* vazio */ }
    if (typeof data.prefsJson === 'string') prefs = JSON.parse(data.prefsJson) as Record<string, unknown>
    if (b.avatar === 'discord') {
      const p = await perfilDiscord(session.user.discordId)
      data.avatar = p?.avatar ?? null; prefs.avatar = 1
    } else if (b.avatar === 'nenhuma') {
      data.avatar = null; prefs.avatar = 0
    } else if (typeof b.avatar === 'string' && b.avatar.startsWith(`${process.env.SUPABASE_URL?.replace(/\/+$/, '')}/storage/v1/object/public/`)) {
      data.avatar = b.avatar; prefs.avatar = 0
    } else return NextResponse.json({ error: 'Foto inválida' }, { status: 400 })
    data.prefsJson = JSON.stringify(prefs)
    if (atual?.avatar && atual.avatar !== data.avatar) void apagarSeNosso(atual.avatar)
  }
  if (!Object.keys(data).length) return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  const u = await prisma.user.update({
    where: { discordId: session.user.discordId }, data,
    select: { nomeExibido: true, bio: true, titulo: true, moldura: true, prefsJson: true, avatar: true },
  }).catch(() => null)
  if (!u) return NextResponse.json({ error: 'Não foi possível salvar' }, { status: 500 })
  return NextResponse.json(u)
}
