import { NextResponse } from 'next/server'
import { prisma } from 'database'
import { membroAtual } from '@/lib/mestre'

/** Edita uma nota (só quem escreveu). Nota "só do mestre" continua exigindo o papel de mestre. */
export async function PATCH(req: Request, { params }: { params: { id: string; noteId: string } }) {
  const { session, member } = await membroAtual(params.id)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const nota = await prisma.note.findFirst({ where: { id: params.noteId, campaignId: params.id, authorId: member.userId } }).catch(() => null)
  if (!nota) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })
  const b = await req.json().catch(() => ({})) as { title?: string | null; content?: string; visibility?: string }
  const data: Record<string, unknown> = {}
  if ('title' in b) data.title = typeof b.title === 'string' ? b.title.trim().slice(0, 200) || null : null
  if (typeof b.content === 'string') {
    const c = b.content.trim().slice(0, 50_000)
    if (!c) return NextResponse.json({ error: 'Conteúdo obrigatório' }, { status: 400 })
    data.content = c
  }
  if (b.visibility === 'PRIVATE' || b.visibility === 'CAMPAIGN' || b.visibility === 'GM_ONLY') {
    if (b.visibility === 'GM_ONLY' && member.role !== 'GM') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    data.visibility = b.visibility
  }
  if (!Object.keys(data).length) return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  return NextResponse.json(await prisma.note.update({ where: { id: nota.id }, data }))
}

export async function DELETE(_req: Request, { params }: { params: { id: string; noteId: string } }) {
  const { session, member } = await membroAtual(params.id)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const r = await prisma.note.deleteMany({ where: { id: params.noteId, campaignId: params.id, authorId: member.userId } })
  if (!r.count) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
