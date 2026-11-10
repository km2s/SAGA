'use client'

export type Destino = { para: 'mapa' | 'capa' | 'handout'; campaignId: string } | { para: 'retrato'; characterId: string } | { para: 'avatar' }

/** Envia a imagem para o bucket (POST /api/uploads). Devolve a URL pública ou a mensagem de erro. */
export async function enviarImagem(file: File, destino: Destino): Promise<{ url: string } | { erro: string }> {
  if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) return { erro: 'Envie PNG, JPG, WEBP ou GIF' }
  if (file.size > 4 * 1024 * 1024) return { erro: 'A imagem pode ter até 4 MB' }
  const fd = new FormData()
  fd.append('file', file)
  for (const [k, v] of Object.entries(destino)) fd.append(k, v)
  const r = await fetch('/api/uploads', { method: 'POST', body: fd }).catch(() => null)
  const j = r ? await r.json().catch(() => null) as { url?: string; error?: string } | null : null
  return j?.url ? { url: j.url } : { erro: j?.error ?? 'Não foi possível enviar a imagem. Tente de novo.' }
}

/** Abre o seletor de arquivos do sistema (sem precisar de um <input> no layout). */
export function escolherImagem(): Promise<File | null> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/png,image/jpeg,image/webp,image/gif'
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.click()
  })
}

/** Primeira imagem de um evento de soltar ou colar. */
export function imagemDe(dt: DataTransfer | null): File | null {
  if (!dt) return null
  for (const f of Array.from(dt.files)) if (f.type.startsWith('image/')) return f
  for (const it of Array.from(dt.items ?? [])) if (it.kind === 'file' && it.type.startsWith('image/')) return it.getAsFile()
  return null
}
