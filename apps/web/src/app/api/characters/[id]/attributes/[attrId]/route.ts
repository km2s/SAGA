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

  const body = await req.json() as { value?: number; customDie?: string }
  const updated = await prisma.characterAttribute.update({
    where: { id: params.attrId },
    data: {
      ...(body.value !== undefined && { value: body.value }),
      ...(body.customDie !== undefined && { customDie: body.customDie }),
    },
    include: { attribute: true },
  })
  return NextResponse.json(updated)
}
