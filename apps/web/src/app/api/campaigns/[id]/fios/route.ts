import { NextResponse } from 'next/server'
import { prisma } from 'database'
import { membroAtual } from '@/lib/mestre'

/** Fios soltos (Painel do Mestre › Visão geral). Só o mestre. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { session, member } = await membroAtual(params.id, true)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return NextResponse.json(await prisma.fio.findMany({ where: { campaignId: params.id }, orderBy: { createdAt: 'asc' } }))
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { session, member } = await membroAtual(params.id, true)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const b = await req.json().catch(() => ({})) as { texto?: string; sessao?: string }
  const texto = typeof b.texto === 'string' ? b.texto.trim().slice(0, 300) : ''
  if (!texto) return NextResponse.json({ error: 'Escreva o fio' }, { status: 400 })
  if (await prisma.fio.count({ where: { campaignId: params.id } }) >= 200) return NextResponse.json({ error: 'Limite de 200 fios' }, { status: 409 })
  const fio = await prisma.fio.create({ data: { campaignId: params.id, texto, sessao: typeof b.sessao === 'string' ? b.sessao.slice(0, 80) : null } })
  return NextResponse.json(fio, { status: 201 })
}
