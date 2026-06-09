import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'
import { PDFParse } from 'pdf-parse'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const EXTRACT_PROMPT = `Você vai receber o texto extraído de uma ficha de personagem de RPG.

Sua tarefa é identificar e retornar um JSON com os seguintes campos:
- "characterName": nome do personagem (string ou null)
- "systemHint": nome do sistema de RPG detectado, se identificável (string ou null). Ex: "Vampire: The Masquerade V20", "D&D 5e", "Call of Cthulhu"
- "attributes": array de objetos com { "name": string, "value": number | null }
  - Inclua apenas atributos com nomes claros (ex: Força, Agilidade, Percepção, Furtividade, Vida...)
  - Omita campos administrativos (jogador, campanha, XP ganho, notas de regras)
  - Se o valor for texto (ex: "●●●○○"), converta para o número de círculos preenchidos
  - Se não encontrar valor numérico, use null

Responda APENAS com o JSON, sem texto adicional, sem markdown, sem explicações.

Exemplo de saída:
{"characterName":"Vitor","systemHint":"Vampire: The Masquerade V20","attributes":[{"name":"Força","value":3},{"name":"Destreza","value":2}]}`

function countDots(val: string): number | null {
  // ●●●○○ style or ***.. style
  const filled = (val.match(/[●•\*x✕■]/g) ?? []).length
  if (filled > 0) return filled
  return null
}

function parseValue(raw: string): number | null {
  const trimmed = raw.trim()
  const dot = countDots(trimmed)
  if (dot !== null) return dot
  const n = parseInt(trimmed, 10)
  return isNaN(n) ? null : n
}

function extractFromHtml(html: string): string {
  // Strip tags, decode basic HTML entities, collapse whitespace
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s{3,}/g, '\n')
    .trim()
    .slice(0, 12000) // cap to avoid huge prompts
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Importação não configurada (ANTHROPIC_API_KEY ausente).' }, { status: 503 })
  }

  const formData = await req.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Formato inválido.' }, { status: 400 })

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 })

  const MAX_MB = 5
  if (file.size > MAX_MB * 1024 * 1024) {
    return NextResponse.json({ error: `Arquivo muito grande (máx ${MAX_MB}MB).` }, { status: 400 })
  }

  let rawText = ''
  const mime = file.type.toLowerCase()
  const name = file.name.toLowerCase()

  try {
    if (mime === 'application/pdf' || name.endsWith('.pdf')) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const parser = new PDFParse({ data: buffer })
      const result = await parser.getText()
      rawText = result.text.slice(0, 12000)
    } else if (
      mime === 'text/html' || name.endsWith('.html') || name.endsWith('.htm')
    ) {
      const text = await file.text()
      rawText = extractFromHtml(text)
    } else {
      return NextResponse.json({ error: 'Formato não suportado. Envie PDF ou HTML.' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Erro ao ler o arquivo.' }, { status: 422 })
  }

  if (!rawText.trim()) {
    return NextResponse.json({ error: 'Nenhum texto encontrado no arquivo.' }, { status: 422 })
  }

  let extracted: {
    characterName: string | null
    systemHint: string | null
    attributes: { name: string; value: number | null }[]
  }

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [
        { role: 'user', content: `${EXTRACT_PROMPT}\n\n---\n${rawText}` },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    extracted = JSON.parse(content.text) as typeof extracted
    if (!Array.isArray(extracted.attributes)) throw new Error('Invalid shape')
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível interpretar a ficha. Tente um arquivo diferente.' },
      { status: 422 },
    )
  }

  // Normalize values that came as strings (model might return "3" or dot strings)
  extracted.attributes = extracted.attributes
    .filter(a => a.name?.trim())
    .map(a => ({
      name: a.name.trim(),
      value: typeof a.value === 'string' ? parseValue(a.value as string) : (typeof a.value === 'number' ? a.value : null),
    }))

  return NextResponse.json(extracted)
}
