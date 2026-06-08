import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await prisma.campaignMember.findFirst({
    where: {
      character: { id: params.id },
      user: { discordId: session.user.discordId },
    },
  }).catch(() => null)
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as {
    name?: string
    value?: number
    defaultDie?: string
  }

  if (!body.name?.trim()) return NextResponse.json({ error: 'Nome do atributo obrigatório' }, { status: 400 })
  if (body.value === undefined) return NextResponse.json({ error: 'Valor obrigatório' }, { status: 400 })

  const sheet = await prisma.characterSheet.findUnique({
    where: { id: params.id },
    include: { member: { include: { campaign: { include: { system: true } } } } },
  }).catch(() => null)
  if (!sheet) return NextResponse.json({ error: 'Ficha não encontrada' }, { status: 404 })

  let systemAttr = await prisma.systemAttribute.findFirst({
    where: {
      name: body.name.trim(),
      systemId: sheet.member.campaign.systemId ?? '__none__',
    },
  }).catch(() => null)

  if (!systemAttr) {
    let system = sheet.member.campaign.system
    if (!system) {
      system = await prisma.rPGSystem.upsert({
        where: { id: sheet.member.campaign.systemId ?? 'none' },
        update: {},
        create: { name: `${sheet.member.campaign.name} (personalizado)` },
      }).catch(() => null)
      if (!system) return NextResponse.json({ error: 'Erro ao criar sistema' }, { status: 500 })
      if (!sheet.member.campaign.systemId) {
        await prisma.campaign.update({
          where: { id: sheet.member.campaign.id },
          data: { systemId: system.id },
        }).catch(() => null)
      }
    }
    systemAttr = await prisma.systemAttribute.create({
      data: {
        name: body.name.trim(),
        defaultDie: body.defaultDie ?? 'd20',
        systemId: system.id,
      },
    })
  }

  const charAttr = await prisma.characterAttribute.upsert({
    where: { sheetId_attributeId: { sheetId: params.id, attributeId: systemAttr.id } },
    update: { value: body.value },
    create: { sheetId: params.id, attributeId: systemAttr.id, value: body.value },
    include: { attribute: true },
  })

  return NextResponse.json(charAttr, { status: 201 })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await prisma.campaignMember.findFirst({
    where: {
      character: { id: params.id },
      user: { discordId: session.user.discordId },
    },
  }).catch(() => null)
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as { charAttributeId?: string }
  if (!body.charAttributeId) return NextResponse.json({ error: 'charAttributeId obrigatório' }, { status: 400 })

  await prisma.characterAttribute.delete({
    where: { id: body.charAttributeId },
  }).catch(() => null)

  return NextResponse.json({ ok: true })
}
