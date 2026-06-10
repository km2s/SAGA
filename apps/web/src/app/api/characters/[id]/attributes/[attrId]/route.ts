import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; attrId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership
  const charAttr = await prisma.characterAttribute.findUnique({
    where: { id: params.attrId },
    include: { sheet: { include: { member: { include: { user: true } } } } },
  }).catch(() => null)
  if (!charAttr) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isMine = charAttr.sheet.member.user.discordId === session.user.discordId
  const isGM = await prisma.campaignMember.findFirst({
    where: { campaignId: charAttr.sheet.member.campaignId, user: { discordId: session.user.discordId }, role: 'GM' },
  })
  if (!isMine && !isGM) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({})) as { value?: number; customDie?: string }

  const data: Record<string, unknown> = {}
  if (body.value !== undefined) {
    if (typeof body.value !== 'number' || !isFinite(body.value)) {
      return NextResponse.json({ error: 'value inválido' }, { status: 400 })
    }
    data.value = Math.max(-999, Math.min(999, Math.round(body.value)))
  }
  if (body.customDie !== undefined) {
    data.customDie = body.customDie === null ? null : String(body.customDie).slice(0, 20) || null
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  const updated = await prisma.characterAttribute.update({
    where: { id: params.attrId },
    data,
    include: { attribute: true },
  })
  return NextResponse.json(updated)
}
