import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'

async function authorizeOwner(systemId: string, discordId: string) {
  const system = await prisma.rPGSystem.findUnique({
    where: { id: systemId },
    include: { creator: { select: { discordId: true } } },
  }).catch(() => null)
  if (!system) return null
  if (system.isPreset || system.creator?.discordId !== discordId) return null
  return system
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const system = await authorizeOwner(params.id, session.user.discordId)
  if (!system) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as { name?: string; defaultDie?: string; description?: string }
  if (!body.name?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const attr = await prisma.systemAttribute.create({
    data: {
      name: body.name.trim().slice(0, 80),
      defaultDie: body.defaultDie?.trim() || 'd20',
      description: body.description?.trim().slice(0, 200) || null,
      systemId: params.id,
    },
  })

  return NextResponse.json(attr, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const system = await authorizeOwner(params.id, session.user.discordId)
  if (!system) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { attributeId } = await req.json() as { attributeId?: string }
  if (!attributeId) return NextResponse.json({ error: 'attributeId obrigatório' }, { status: 400 })

  // Atributo usado por fichas não sai: apagar levaria os valores dos jogadores junto.
  const uso = await prisma.systemAttribute.findFirst({ where: { id: attributeId, systemId: params.id }, select: { name: true, _count: { select: { characterAttributes: true, npcAttributes: true } } } }).catch(() => null)
  if (!uso) return NextResponse.json({ error: 'Atributo não encontrado' }, { status: 404 })
  const n = uso._count.characterAttributes + uso._count.npcAttributes
  if (n > 0) return NextResponse.json({ error: `"${uso.name}" está em ${n} ficha${n === 1 ? '' : 's'} e não pode ser apagado.` }, { status: 409 })
  await prisma.systemAttribute.delete({ where: { id: attributeId } })
  return NextResponse.json({ success: true })
}

/**
 * Editar Sistema › "Salvar": a lista inteira, na ordem da ficha.
 * `{ attributes: [{ id?, name, defaultDie }] }`: com id atualiza (nome, dado, ordem), sem id cria,
 * e os que sumiram da lista são apagados. Nada muda se algum nome estiver vazio ou repetido,
 * ou se um atributo a apagar estiver em uso por fichas (409).
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const system = await authorizeOwner(params.id, session.user.discordId)
  if (!system) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({})) as { attributes?: { id?: string; name?: string; defaultDie?: string }[] }
  if (!Array.isArray(body.attributes) || body.attributes.length > 200) return NextResponse.json({ error: 'Lista de atributos inválida' }, { status: 400 })
  const lista = body.attributes.map((a, i) => ({ id: typeof a.id === 'string' ? a.id : null, name: (a.name ?? '').trim().slice(0, 80), defaultDie: /^\d*d\d+$/.test(a.defaultDie ?? '') ? a.defaultDie! : 'd20', order: i }))
  if (lista.some(a => !a.name)) return NextResponse.json({ error: 'Todo atributo precisa de nome.' }, { status: 400 })
  const nomes = lista.map(a => a.name.toLowerCase())
  if (new Set(nomes).size !== nomes.length) return NextResponse.json({ error: 'Há atributos com o mesmo nome.' }, { status: 400 })

  const atuais = await prisma.systemAttribute.findMany({ where: { systemId: params.id }, select: { id: true, name: true, _count: { select: { characterAttributes: true, npcAttributes: true } } } })
  const ficam = new Set(lista.map(a => a.id).filter(Boolean))
  const saem = atuais.filter(a => !ficam.has(a.id))
  const emUso = saem.filter(a => a._count.characterAttributes + a._count.npcAttributes > 0)
  if (emUso.length) return NextResponse.json({ error: `Em uso por fichas, não podem sair: ${emUso.map(a => a.name).join(', ')}.` }, { status: 409 })
  const ids = new Set(atuais.map(a => a.id))
  if (lista.some(a => a.id && !ids.has(a.id))) return NextResponse.json({ error: 'Atributo de outro sistema' }, { status: 400 })

  await prisma.$transaction([
    prisma.systemAttribute.deleteMany({ where: { id: { in: saem.map(a => a.id) } } }),
    ...lista.map(a => a.id
      ? prisma.systemAttribute.update({ where: { id: a.id }, data: { name: a.name, defaultDie: a.defaultDie, order: a.order } })
      : prisma.systemAttribute.create({ data: { name: a.name, defaultDie: a.defaultDie, order: a.order, systemId: params.id } })),
  ])
  const attributes = await prisma.systemAttribute.findMany({ where: { systemId: params.id }, orderBy: [{ order: 'asc' }, { name: 'asc' }] })
  return NextResponse.json({ attributes })
}
