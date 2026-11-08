import { NextResponse } from 'next/server'
import { prisma } from 'database'
import { membroAtual } from '@/lib/mestre'
import { dataValida, horarioValido, quandoDe } from '@/lib/convite'

/** Agenda da campanha: todos os membros leem; só o mestre agenda. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { session, member } = await membroAtual(params.id)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return NextResponse.json(await prisma.sessaoAgendada.findMany({
    where: { campaignId: params.id, quando: { gt: new Date(Date.now() - 3 * 3600_000) } }, orderBy: { quando: 'asc' },
    select: { id: true, titulo: true, data: true, horario: true, lembrete: true },
  }))
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { session, member } = await membroAtual(params.id, true)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const b = await req.json().catch(() => ({})) as { titulo?: string; data?: string; horario?: string; lembrete?: boolean }
  if (!dataValida(b.data) || !horarioValido(b.horario)) return NextResponse.json({ error: 'Data ou horário inválido' }, { status: 400 })
  const quando = quandoDe(b.data, b.horario)
  if (quando.getTime() < Date.now() - 3600_000) return NextResponse.json({ error: 'Escolha uma data a partir de hoje' }, { status: 400 })
  if (await prisma.sessaoAgendada.count({ where: { campaignId: params.id, quando: { gt: new Date() } } }) >= 30) return NextResponse.json({ error: 'Limite de 30 sessões agendadas' }, { status: 409 })
  const titulo = typeof b.titulo === 'string' && b.titulo.trim() ? b.titulo.trim().slice(0, 100) : 'Sessão'
  const ag = await prisma.sessaoAgendada.create({
    data: { campaignId: params.id, titulo, data: b.data, horario: b.horario, quando, lembrete: b.lembrete !== false },
    select: { id: true, titulo: true, data: true, horario: true, lembrete: true },
  })
  return NextResponse.json(ag, { status: 201 })
}
