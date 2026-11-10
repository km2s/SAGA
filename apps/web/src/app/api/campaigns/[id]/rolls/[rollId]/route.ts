import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'
import { leitor, serializar } from '@/lib/rolagens'

/**
 * "Revelar à mesa" (só o mestre): a rolagem privada passa a valer como pública.
 * Não vale para "só para mim" de jogador (o mestre nem a vê).
 * `{ revelar: true }` → a rolagem serializada para o mestre.
 */
export async function PATCH(req: Request, { params }: { params: { id: string; rollId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await prisma.campaignMember.findFirst({
    where: { campaignId: params.id, user: { discordId: session.user.discordId } },
  }).catch(() => null)
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (member.role !== 'GM') return NextResponse.json({ error: 'Só o Mestre revela rolagens' }, { status: 403 })

  const body = await req.json().catch(() => ({})) as { revelar?: boolean }
  if (body.revelar !== true) return NextResponse.json({ error: 'Nada para mudar' }, { status: 400 })

  const roll = await prisma.rollLog.findFirst({ where: { id: params.rollId, session: { campaignId: params.id } } }).catch(() => null)
  if (!roll) return NextResponse.json({ error: 'Rolagem não encontrada' }, { status: 404 })
  if (roll.visibility === 'SELF' && roll.memberId !== member.id) return NextResponse.json({ error: 'Rolagem não encontrada' }, { status: 404 })
  if (roll.visibility === 'PUBLIC' || roll.revealedAt) {
    return NextResponse.json(serializar(roll, leitor(member, session.user.username), { memberId: member.id, username: session.user.username }))
  }

  const updated = await prisma.rollLog.update({ where: { id: roll.id }, data: { revealedAt: new Date() } })
  return NextResponse.json(serializar(updated, leitor(member, session.user.username), { memberId: member.id, username: session.user.username }))
}
