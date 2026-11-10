import { prisma } from 'database'
import { NextResponse } from 'next/server'
import { applyRateLimit } from '@/lib/rate-limit'
import { COOKIE_2FA, bilhete, confere, decifrar, gastarCodigo, lerBilhete } from '@/lib/dois-fatores'

/**
 * Login com verificação em duas etapas: { t: bilhete do login, codigo } → libera o
 * próximo login do Discord por 5 minutos (cookie assinado). Aceita código de recuperação.
 */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as { t?: string; codigo?: string }
  const discordId = lerBilhete(b.t, 'login')
  if (!discordId) return NextResponse.json({ error: 'O tempo para confirmar acabou. Entre de novo pelo Discord.' }, { status: 401 })
  const rl = applyRateLimit(`verificar:${discordId}`, { max: 6, windowMs: 60 * 1000 })
  if (rl) return rl
  const u = await prisma.user.findUnique({ where: { discordId }, select: { id: true, totpSecret: true, recuperacaoJson: true } }).catch(() => null)
  if (!u) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
  const codigo = String(b.codigo ?? '').replace(/\s/g, '')
  const segredo = decifrar(u.totpSecret)
  let ok = !!segredo && confere(segredo, codigo)
  if (!ok) {
    const resto = gastarCodigo(u.recuperacaoJson, codigo)
    if (resto !== null) { ok = true; await prisma.user.update({ where: { id: u.id }, data: { recuperacaoJson: resto } }) }
  }
  if (!ok) return NextResponse.json({ error: 'Código inválido ou expirado. Confira o relógio do celular e tente o próximo.' }, { status: 400 })
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_2FA, bilhete(discordId, 'ok', 5), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 300 })
  return res
}
