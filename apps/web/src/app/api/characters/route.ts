import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'

function wodAttrDefault(description: string | null): number {
  const d = description?.trim() ?? ''
  if (
    d.startsWith('Talento') || d.startsWith('Perícia') || d.startsWith('Conhecimento') ||
    d.startsWith('Habilidade') || d.startsWith('Disciplina') || d.startsWith('Antecedente')
  ) return 0
  if (d.startsWith('Virtude')) return 1
  return 1
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    campaignId?: string
    name?: string
    race?: string
    class?: string
    level?: number
    hp?: number
    maxHp?: number
    imageUrl?: string
    systemId?: string | null
    // import flow
    systemName?: string
    importedAttributes?: { name: string; value: number }[]
  }

  if (!body.campaignId) return NextResponse.json({ error: 'campaignId obrigatório' }, { status: 400 })
  if (!body.name?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const user = await prisma.user.findUnique({
    where: { discordId: session.user.discordId },
  }).catch(() => null)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const member = await prisma.campaignMember.findFirst({
    where: { userId: user.id, campaignId: body.campaignId },
    include: { character: true },
  }).catch(() => null)
  if (!member) return NextResponse.json({ error: 'Você não é membro desta campanha' }, { status: 403 })
  if (member.role === 'GM') return NextResponse.json({ error: 'Mestres não podem criar personagens em sua própria campanha' }, { status: 403 })
  if (member.character) return NextResponse.json({ error: 'Você já tem um personagem nesta campanha' }, { status: 409 })

  const imageUrl = body.imageUrl?.trim() || null
  if (imageUrl && !/^https:\/\//i.test(imageUrl)) {
    return NextResponse.json({ error: 'imageUrl deve começar com https://' }, { status: 400 })
  }

  const maxHp = Math.max(1, body.maxHp ?? 10)
  const character = await prisma.characterSheet.create({
    data: {
      name: body.name.trim().slice(0, 100),
      race: body.race?.trim().slice(0, 60) || null,
      class: body.class?.trim().slice(0, 60) || null,
      level: Math.max(1, body.level ?? 1),
      hp: Math.max(0, Math.min(maxHp, body.hp ?? maxHp)),
      maxHp,
      imageUrl,
      memberId: member.id,
    },
  })

  if (body.importedAttributes && body.importedAttributes.length > 0) {
    if (body.importedAttributes.length > 200) {
      return NextResponse.json({ error: 'Máximo de 200 atributos por importação' }, { status: 400 })
    }
    // ── Imported attributes: find or create a user system to hold them ──────
    const imported = body.importedAttributes.filter(a => a.name.trim())
    const sysName = body.systemName?.trim().slice(0, 100) || 'Ficha Importada'

    // Look for an existing user-owned system with this name
    let targetSystem = await prisma.rPGSystem.findFirst({
      where: { name: sysName, creatorId: user.id, isPreset: false },
      include: { attributes: true },
    }).catch(() => null)

    if (!targetSystem) {
      // Try matching a preset system by name to copy its category
      const preset = await prisma.rPGSystem.findFirst({
        where: { name: sysName, isPreset: true },
        select: { category: true },
      }).catch(() => null)

      targetSystem = await prisma.rPGSystem.create({
        data: {
          name: sysName,
          category: preset?.category ?? 'custom',
          isPreset: false,
          creatorId: user.id,
        },
        include: { attributes: true },
      })
    }

    // Match imported attr names to existing system attributes (case-insensitive)
    const existingByName = new Map(
      targetSystem.attributes.map(a => [a.name.toLowerCase(), a.id])
    )

    const toCreate = imported.filter(a => !existingByName.has(a.name.toLowerCase()))
    if (toCreate.length > 0) {
      await prisma.systemAttribute.createMany({
        data: toCreate.map(a => ({
          name: a.name.trim().slice(0, 80),
          defaultDie: 'd20',
          systemId: targetSystem!.id,
        })),
        skipDuplicates: true,
      })
    }

    // Re-fetch all attributes for this system to get their IDs
    const allAttrs = await prisma.systemAttribute.findMany({
      where: { systemId: targetSystem.id },
    })
    const attrIdByName = new Map(allAttrs.map(a => [a.name.toLowerCase(), a.id]))

    await prisma.characterAttribute.createMany({
      data: imported
        .map(a => ({
          sheetId: character.id,
          attributeId: attrIdByName.get(a.name.toLowerCase()) ?? '',
          value: a.value ?? 0,
        }))
        .filter(a => a.attributeId),
      skipDuplicates: true,
    }).catch(() => null)

  } else if (body.systemId) {
    // ── Normal flow: seed from preset system ─────────────────────────────────
    const systemAttrs = await prisma.systemAttribute.findMany({
      where: { systemId: body.systemId },
    }).catch(() => [])

    if (systemAttrs.length > 0) {
      const regularAttrs = systemAttrs.filter(a => a.defaultDie !== 'text')
      const textAttrs = systemAttrs.filter(a => a.defaultDie === 'text')

      if (regularAttrs.length > 0) {
        await prisma.characterAttribute.createMany({
          data: regularAttrs.map(a => ({
            sheetId: character.id,
            attributeId: a.id,
            value: wodAttrDefault(a.description),
          })),
          skipDuplicates: true,
        }).catch(() => null)
      }

      if (textAttrs.length > 0) {
        await prisma.characterTextField.createMany({
          data: textAttrs.map((a, i) => ({
            sheetId: character.id,
            key: `custom_sec_${a.id}`,
            label: a.description?.startsWith('secao:') ? a.description.replace('secao:', '') : a.name,
            value: '',
            order: i,
          })),
          skipDuplicates: true,
        }).catch(() => null)
      }
    }
  }

  return NextResponse.json(character, { status: 201 })
}
