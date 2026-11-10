import { NextResponse } from 'next/server'
import { prisma } from 'database'
import { membroAtual } from '@/lib/mestre'

/**
 * Recado fixado do canal (Mensagens): só o mestre. `{ texto }` escreve (vazio ou
 * null desafixa); `{ mensagemId }` fixa o texto de uma mensagem da campanha.
 */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { session, member } = await membroAtual(params.id, true)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!member) return NextResponse.json({ error: 'Só o Mestre fixa recados' }, { status: 403 })
  const b = await req.json().catch(() => ({})) as { texto?: string | null; mensagemId?: string }
  let texto: string | null
  if (b.mensagemId) {
    // Sussurro não vira recado: o recado é para toda a campanha.
    const m = await prisma.mensagem.findFirst({ where: { id: b.mensagemId, campaignId: params.id, paraId: null }, select: { texto: true } }).catch(() => null)
    if (!m) return NextResponse.json({ error: 'Mensagem não encontrada' }, { status: 404 })
    texto = m.texto
  } else texto = typeof b.texto === 'string' ? b.texto.trim().slice(0, 600) || null : null
  const c = await prisma.campaign.update({ where: { id: params.id }, data: { recado: texto, recadoEm: texto ? new Date() : null }, select: { recado: true, recadoEm: true } })
  return NextResponse.json({ recado: c.recado, em: c.recadoEm?.toISOString() ?? null })
}
