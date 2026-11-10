import { randomUUID } from 'crypto'

/**
 * Supabase Storage (bucket público `saga-uploads`) pela API REST, só no servidor.
 * Precisa de SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel.
 */
const URL_BASE = process.env.SUPABASE_URL?.replace(/\/+$/, '')
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
export const BUCKET = 'saga-uploads'
/** A Vercel recusa corpos acima de 4,5 MB; 4 MB deixa folga para o multipart. */
export const MAX_BYTES = 4 * 1024 * 1024

export const storageConfigurado = () => !!(URL_BASE && KEY)
const publica = (path: string) => `${URL_BASE}/storage/v1/object/public/${BUCKET}/${path}`

/** Tipo real pelos primeiros bytes (não confia no que o navegador diz). */
export function tipoImagem(b: Uint8Array): { mime: string; ext: string } | null {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { mime: 'image/png', ext: 'png' }
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' }
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return { mime: 'image/gif', ext: 'gif' }
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { mime: 'image/webp', ext: 'webp' }
  return null
}

/** Envia e devolve a URL pública. `pasta` sem barra no fim (ex.: "campanhas/<id>/mapas"). */
export async function enviarImagem(pasta: string, dados: Uint8Array, tipo: { mime: string; ext: string }): Promise<string | null> {
  if (!URL_BASE || !KEY) return null
  const path = `${pasta}/${randomUUID()}.${tipo.ext}`
  const r = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, apikey: KEY, 'Content-Type': tipo.mime, 'Cache-Control': '31536000', 'x-upsert': 'false' },
    body: new Blob([dados as BlobPart], { type: tipo.mime }),
  }).catch(() => null)
  if (!r?.ok) { console.error('[storage] falha ao enviar', r?.status, await r?.text().catch(() => '')); return null }
  return publica(path)
}

/** Apaga um arquivo nosso a partir da URL pública (ignora links de fora). */
export async function apagarSeNosso(url: string | null | undefined) {
  if (!url || !URL_BASE || !KEY) return
  const prefixo = `${URL_BASE}/storage/v1/object/public/${BUCKET}/`
  if (!url.startsWith(prefixo)) return
  const path = url.slice(prefixo.length)
  await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${KEY}`, apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: [path] }),
  }).catch(() => null)
}
