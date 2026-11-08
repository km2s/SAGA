import { NextResponse } from 'next/server'
import { gravarCodigo, normalizar } from '@/lib/convite'
import { membroAtual } from '@/lib/mestre'

/** "Gerar novo" (Painel › Config): grava o código pedido, ou outro se já existir. O antigo deixa de valer. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { session, member } = await membroAtual(params.id, true)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const b = await req.json().catch(() => ({})) as { codigo?: string }
  const codigo = await gravarCodigo(params.id, typeof b.codigo === 'string' ? normalizar(b.codigo) : null).catch(() => null)
  if (!codigo) return NextResponse.json({ error: 'Não foi possível gerar o código' }, { status: 500 })
  return NextResponse.json({ codigo })
}
