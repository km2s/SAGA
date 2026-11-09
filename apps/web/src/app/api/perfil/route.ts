import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'

const MOLDURAS = ['Ouro', 'Cera', 'Ferro', 'Sangue']
const PREFS = ['avatar', 'nome', 'dm', 'rolls'] as const

/**
 * SAGA Perfil: nome exibido, bio, título, moldura e preferências do Discord.
 * O usuário (@) é o do Discord e volta a cada login, por isso não muda aqui.
 */
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({})) as { nome?: string; bio?: string; titulo?: string; moldura?: string; discord?: Record<string, unknown> }
  const data: Record<string, unknown> = {}
  if (typeof b.nome === 'string') data.nomeExibido = b.nome.trim().slice(0, 40) || null
  if (typeof b.bio === 'string') data.bio = b.bio.trim().slice(0, 240) || null
  if (typeof b.titulo === 'string') data.titulo = b.titulo.trim().slice(0, 80) || null
  if (typeof b.moldura === 'string' && MOLDURAS.includes(b.moldura)) data.moldura = b.moldura
  if (b.discord && typeof b.discord === 'object') {
    data.prefsJson = JSON.stringify(Object.fromEntries(PREFS.map(k => [k, b.discord![k] ? 1 : 0])))
  }
  if (!Object.keys(data).length) return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  const u = await prisma.user.update({
    where: { discordId: session.user.discordId }, data,
    select: { nomeExibido: true, bio: true, titulo: true, moldura: true, prefsJson: true },
  }).catch(() => null)
  if (!u) return NextResponse.json({ error: 'Não foi possível salvar' }, { status: 500 })
  return NextResponse.json(u)
}
