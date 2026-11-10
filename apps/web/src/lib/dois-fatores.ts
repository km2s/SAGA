import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto'

/**
 * Verificação em duas etapas (SAGA Segurança): TOTP (RFC 6238, 6 dígitos, 30 s),
 * segredo cifrado com a chave do NEXTAUTH_SECRET, códigos de recuperação guardados
 * em hash e o "bilhete" assinado que leva o login do Discord até /verificar.
 */
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const chave = () => createHash('sha256').update(`saga-2fa:${process.env.NEXTAUTH_SECRET ?? ''}`).digest()

export function base32(buf: Buffer): string {
  let bits = 0, val = 0, out = ''
  for (const b of buf) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5 } }
  if (bits > 0) out += B32[(val << (5 - bits)) & 31]
  return out
}
function deBase32(s: string): Buffer {
  let bits = 0, val = 0
  const out: number[] = []
  for (const ch of s.replace(/=+$/, '').toUpperCase()) {
    const i = B32.indexOf(ch); if (i < 0) continue
    val = (val << 5) | i; bits += 5
    if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8 }
  }
  return Buffer.from(out)
}

export const novoSegredo = () => base32(randomBytes(20))

function codigoEm(segredo: string, passo: number): string {
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(passo))
  const h = createHmac('sha1', deBase32(segredo)).update(msg).digest()
  const o = h[h.length - 1]! & 15
  const n = ((h[o]! & 127) << 24) | (h[o + 1]! << 16) | (h[o + 2]! << 8) | h[o + 3]!
  return String(n % 1_000_000).padStart(6, '0')
}
/** Aceita o código atual e o vizinho de cada lado (relógio do celular um pouco fora). */
export function confere(segredo: string, codigo: string): boolean {
  if (!/^\d{6}$/.test(codigo)) return false
  const passo = Math.floor(Date.now() / 30_000)
  return [-1, 0, 1].some(d => igual(codigoEm(segredo, passo + d), codigo))
}
const igual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

export const otpauth = (segredo: string, conta: string) =>
  `otpauth://totp/${encodeURIComponent(`SAGA:${conta}`)}?secret=${segredo}&issuer=SAGA&digits=6&period=30`

// ── Segredo cifrado no banco (AES-256-GCM) ──
export function cifrar(texto: string): string {
  const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', chave(), iv)
  const dados = Buffer.concat([c.update(texto, 'utf8'), c.final()])
  return [iv, c.getAuthTag(), dados].map(b => b.toString('base64url')).join('.')
}
export function decifrar(s: string | null | undefined): string | null {
  if (!s) return null
  try {
    const [iv, tag, dados] = s.split('.').map(x => Buffer.from(x, 'base64url'))
    const d = createDecipheriv('aes-256-gcm', chave(), iv!); d.setAuthTag(tag!)
    return Buffer.concat([d.update(dados!), d.final()]).toString('utf8')
  } catch { return null }
}

// ── Códigos de recuperação: 10 de XXXX-XXXX, guardados só o hash; cada um vale uma vez ──
const ALF = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const hashCodigo = (c: string) => createHash('sha256').update(`saga-rec:${c.replace(/[^A-Z0-9]/gi, '').toUpperCase()}`).digest('hex')
export function novosCodigos(): { codigos: string[]; json: string } {
  const codigos = Array.from({ length: 10 }, () => { const s = Array.from({ length: 8 }, () => ALF[randomInt(ALF.length)]).join(''); return `${s.slice(0, 4)}-${s.slice(4)}` })
  return { codigos, json: JSON.stringify(codigos.map(hashCodigo)) }
}
/** Usa um código de recuperação: devolve o JSON sem ele, ou null se não vale. */
export function gastarCodigo(json: string | null, codigo: string): string | null {
  let hs: string[] = []
  try { hs = JSON.parse(json ?? '[]') as string[] } catch { return null }
  const h = hashCodigo(codigo), i = hs.indexOf(h)
  if (i < 0) return null
  hs.splice(i, 1)
  return JSON.stringify(hs)
}

// ── Bilhete assinado (login → /verificar) e liberação (verificado → segundo login) ──
const assinar = (dados: string) => createHmac('sha256', chave()).update(dados).digest('base64url')
export function bilhete(discordId: string, tipo: 'login' | 'ok', minutos: number): string {
  const corpo = Buffer.from(JSON.stringify({ d: discordId, t: tipo, e: Date.now() + minutos * 60_000 })).toString('base64url')
  return `${corpo}.${assinar(corpo)}`
}
export function lerBilhete(b: string | undefined | null, tipo: 'login' | 'ok'): string | null {
  if (!b) return null
  const [corpo, ass] = b.split('.')
  if (!corpo || !ass || !igual(assinar(corpo), ass)) return null
  try {
    const j = JSON.parse(Buffer.from(corpo, 'base64url').toString('utf8')) as { d?: string; t?: string; e?: number }
    return j.t === tipo && typeof j.e === 'number' && j.e > Date.now() && typeof j.d === 'string' ? j.d : null
  } catch { return null }
}
export const COOKIE_2FA = 'saga_2fa_ok'
