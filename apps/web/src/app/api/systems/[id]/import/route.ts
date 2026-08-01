import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { mergedAttributesFrom, sanitizeSystemIds } from '@/lib/system-clone'

/**
 * Importa os atributos de outros sistemas para um sistema custom do usuário
 * (ex.: popular um homebrew com o modelo de ficha do Vampiro V20 + Lobisomem).
 * Duplicados são ignorados pelo nome — tanto entre as origens quanto contra os
 * atributos que o sistema já tem.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const system = await prisma.rPGSystem.findUnique({
    where: { id: params.id },
    include: { creator: { select: { discordId: true } }, attributes: { select: { name: true } } },
  }).catch(() => null)
  if (!system) return NextResponse.json({ error: 'Sistema não encontrado' }, { status: 404 })
  if (system.isPreset || system.creator?.discordId !== session.user.discordId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({})) as { fromSystemIds?: string[] }
  const fromIds = sanitizeSystemIds(body.fromSystemIds).filter(id => id !== params.id)
  if (fromIds.length === 0) {
    return NextResponse.json({ error: 'Escolha ao menos um sistema de origem' }, { status: 400 })
  }

  const existing = new Set(system.attributes.map(a => a.name.trim().toLowerCase()))
  const merged = (await mergedAttributesFrom(fromIds))
    .filter(a => !existing.has(a.name.trim().toLowerCase()))

  if (merged.length > 0) {
    await prisma.systemAttribute.createMany({
      data: merged.map(a => ({
        systemId: params.id, name: a.name, defaultDie: a.defaultDie, description: a.description,
      })),
    }).catch(() => null)
  }

  const attributes = await prisma.systemAttribute.findMany({
    where: { systemId: params.id },
    orderBy: { name: 'asc' },
  }).catch(() => [])

  return NextResponse.json({ imported: merged.length, attributes })
}
