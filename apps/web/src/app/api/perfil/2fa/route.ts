import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { applyRateLimit } from '@/lib/rate-limit'
import { withNoCache } from '@/lib/no-cache'
import { cifrar, confere, decifrar, gastarCodigo, novoSegredo, novosCodigos, otpauth } from '@/lib/dois-fatores'

async function eu() {
  const session = await getServerSession(authOptions)
  if (!session) return null
  return prisma.user.findUnique({ where: { discordId: session.user.discordId }, select: { id: true, discordId: true, username: true, totpSecret: true, totpAtivoEm: true, recuperacaoJson: true } }).catch(() => null)
}

/** Estado da verificação em duas etapas (SAGA Segurança). */
export async function GET() {
  const u = await eu()
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return withNoCache(NextResponse.json({ ativo: !!u.totpAtivoEm, desde: u.totpAtivoEm?.toISOString() ?? null }))
}

/**
 * { acao: 'iniciar' } → chave e QR (o segredo fica pendente até confirmar)
 * { acao: 'confirmar', codigo } → ativa e devolve os 10 códigos de recuperação
 * { acao: 'novos-codigos' } → troca os códigos de recuperação
 * { acao: 'desativar', codigo } → código do app ou de recuperação
 */
export async function POST(req: Request) {
  const u = await eu()
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rl = applyRateLimit(`2fa:${u.discordId}`, { max: 10, windowMs: 60 * 1000 })
  if (rl) return rl
  const b = await req.json().catch(() => ({})) as { acao?: string; codigo?: string }
  const codigo = String(b.codigo ?? '').replace(/\s/g, '')

  if (b.acao === 'iniciar') {
    if (u.totpAtivoEm) return NextResponse.json({ error: 'A verificação já está ativa' }, { status: 409 })
    const segredo = novoSegredo()
    await prisma.user.update({ where: { id: u.id }, data: { totpSecret: cifrar(segredo) } })
    const qr = QRCode.create(otpauth(segredo, u.username), { errorCorrectionLevel: 'M' })
    return NextResponse.json({
      chave: segredo.match(/.{1,4}/g)!.join(' '),
      qr: { n: qr.modules.size, bits: Array.from(qr.modules.data, x => (x ? '1' : '0')).join('') },
    })
  }
  if (b.acao === 'confirmar') {
    const segredo = decifrar(u.totpSecret)
    if (!segredo) return NextResponse.json({ error: 'Comece de novo: a chave expirou.' }, { status: 400 })
    if (!confere(segredo, codigo)) return NextResponse.json({ error: 'Código inválido ou expirado. Confira o relógio do celular e tente o próximo.' }, { status: 400 })
    const { codigos, json } = novosCodigos()
    await prisma.user.update({ where: { id: u.id }, data: { totpAtivoEm: u.totpAtivoEm ?? new Date(), recuperacaoJson: json } })
    return NextResponse.json({ codigos })
  }
  if (b.acao === 'novos-codigos') {
    if (!u.totpAtivoEm) return NextResponse.json({ error: 'A verificação não está ativa' }, { status: 400 })
    const { codigos, json } = novosCodigos()
    await prisma.user.update({ where: { id: u.id }, data: { recuperacaoJson: json } })
    return NextResponse.json({ codigos })
  }
  if (b.acao === 'desativar') {
    const segredo = decifrar(u.totpSecret)
    const ok = (segredo && confere(segredo, codigo)) || gastarCodigo(u.recuperacaoJson, codigo) !== null
    if (!ok) return NextResponse.json({ error: 'Código inválido.' }, { status: 400 })
    await prisma.user.update({ where: { id: u.id }, data: { totpSecret: null, totpAtivoEm: null, recuperacaoJson: null } })
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 })
}
