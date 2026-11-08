import { NextResponse } from 'next/server'
import { prisma } from 'database'
import { membroAtual } from '@/lib/mestre'

export async function DELETE(_req: Request, { params }: { params: { id: string; agId: string } }) {
  const { session, member } = await membroAtual(params.id, true)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await prisma.sessaoAgendada.deleteMany({ where: { id: params.agId, campaignId: params.id } })
  return NextResponse.json({ ok: true })
}
