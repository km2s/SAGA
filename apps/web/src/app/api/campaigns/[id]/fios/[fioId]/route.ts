import { NextResponse } from 'next/server'
import { prisma } from 'database'
import { membroAtual } from '@/lib/mestre'

export async function PATCH(req: Request, { params }: { params: { id: string; fioId: string } }) {
  const { session, member } = await membroAtual(params.id, true)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const b = await req.json().catch(() => ({})) as { feito?: boolean; texto?: string }
  const data: Record<string, unknown> = {}
  if (typeof b.feito === 'boolean') data.feito = b.feito
  if (typeof b.texto === 'string' && b.texto.trim()) data.texto = b.texto.trim().slice(0, 300)
  const r = await prisma.fio.updateMany({ where: { id: params.fioId, campaignId: params.id }, data })
  if (!r.count) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: { id: string; fioId: string } }) {
  const { session, member } = await membroAtual(params.id, true)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await prisma.fio.deleteMany({ where: { id: params.fioId, campaignId: params.id } })
  return NextResponse.json({ ok: true })
}
