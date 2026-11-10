import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'
import { applyRateLimit } from '@/lib/rate-limit'
import { MAX_BYTES, enviarImagem, storageConfigurado, tipoImagem } from '@/lib/storage'

const PARA = ['mapa', 'capa', 'handout', 'retrato', 'avatar'] as const
type Para = typeof PARA[number]

/**
 * Envio de imagem (multipart: `file`, `para`, `campaignId` ou `characterId`).
 * Só grava o arquivo e devolve `{ url }`; quem usa a URL é a rota de sempre
 * (PATCH do mapa, da campanha, do personagem ou do perfil), que confere de novo.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!storageConfigurado()) return NextResponse.json({ error: 'Envio de imagens ainda não configurado' }, { status: 503 })
  const rl = applyRateLimit(`upload:${session.user.discordId}`, { max: 20, windowMs: 10 * 60 * 1000 })
  if (rl) return rl

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  const para = form?.get('para') as Para | null
  if (!form || !(file instanceof Blob) || !para || !PARA.includes(para)) return NextResponse.json({ error: 'Envio inválido' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'A imagem pode ter até 4 MB' }, { status: 413 })

  const user = await prisma.user.findUnique({ where: { discordId: session.user.discordId }, select: { id: true } }).catch(() => null)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Quem pode enviar para onde.
  let pasta: string
  if (para === 'avatar') pasta = `usuarios/${user.id}`
  else if (para === 'retrato') {
    const characterId = String(form.get('characterId') ?? '')
    const ch = await prisma.characterSheet.findUnique({ where: { id: characterId }, select: { member: { select: { userId: true, campaignId: true } } } }).catch(() => null)
    if (!ch) return NextResponse.json({ error: 'Personagem não encontrado' }, { status: 404 })
    const gm = ch.member.userId === user.id || !!(await prisma.campaignMember.findFirst({ where: { campaignId: ch.member.campaignId, userId: user.id, role: 'GM' }, select: { id: true } }).catch(() => null))
    if (!gm) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    pasta = `campanhas/${ch.member.campaignId}/retratos`
  } else {
    const campaignId = String(form.get('campaignId') ?? '')
    const m = await prisma.campaignMember.findFirst({ where: { campaignId, userId: user.id, role: 'GM' }, select: { id: true } }).catch(() => null)
    if (!m) return NextResponse.json({ error: 'Só o mestre envia imagens da campanha' }, { status: 403 })
    pasta = `campanhas/${campaignId}/${para === 'mapa' ? 'mapas' : para === 'capa' ? 'capas' : 'handouts'}`
  }

  const dados = new Uint8Array(await file.arrayBuffer())
  const tipo = tipoImagem(dados)
  if (!tipo) return NextResponse.json({ error: 'Envie PNG, JPG, WEBP ou GIF' }, { status: 415 })
  const url = await enviarImagem(pasta, dados, tipo)
  if (!url) return NextResponse.json({ error: 'Não foi possível enviar a imagem. Tente de novo.' }, { status: 502 })
  return NextResponse.json({ url }, { status: 201 })
}
