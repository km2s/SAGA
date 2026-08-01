import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { logSecurity } from '@/lib/security-log'
import Anthropic from '@anthropic-ai/sdk'
import { PDFParse } from 'pdf-parse'

// Instrução do sistema separada dos dados do usuário (previne prompt injection)
const SYSTEM_PROMPT = `Você é um extrator de dados de fichas de personagem de RPG.
Analise o texto fornecido e retorne APENAS um JSON com:
- "characterName": nome do personagem (string ou null)
- "systemHint": nome do sistema RPG detectado (string ou null). Ex: "Vampire: The Masquerade V20", "D&D 5e"
- "attributes": array de objetos { "name": string, "value": number | null }
  - Inclua apenas atributos com nomes claros (Força, Agilidade, Percepção, Vida...)
  - Omita campos administrativos (jogador, campanha, XP ganho, notas de regras)
  - Se o valor for texto (ex: "●●●○○"), converta para o número de círculos preenchidos
  - Se não encontrar valor numérico, use null

Responda APENAS com o JSON válido, sem texto adicional, sem markdown, sem explicações.`

const MAX_ATTRIBUTES = 100
const MAX_NAME_LEN   = 100
const MAX_TEXT_LEN   = 12_000
const MAX_FILE_BYTES = 5 * 1024 * 1024
const PARSE_TIMEOUT  = 15_000

function countDots(val: string): number | null {
  const filled = (val.match(/[●•*x✕■]/g) ?? []).length
  return filled > 0 ? filled : null
}

function parseValue(raw: string): number | null {
  const trimmed = raw.trim()
  const dot = countDots(trimmed)
  if (dot !== null) return dot
  const n = parseInt(trimmed, 10)
  return isNaN(n) ? null : n
}

function extractFromHtml(html: string): string {
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
    .slice(0, MAX_TEXT_LEN)
}

function isPdf(buffer: Buffer): boolean {
  return buffer.slice(0, 5).toString('ascii') === '%PDF-'
}

function isHtml(buffer: Buffer): boolean {
  const header = buffer.slice(0, 100).toString('utf8').toLowerCase()
  return header.includes('<!doctype html') || header.includes('<html')
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit: 5 imports/hora por usuário
  const rateLimitRes = applyRateLimit(
    `import:${session.user.discordId}`,
    RATE_LIMITS.characterImport,
  )
  if (rateLimitRes) {
    logSecurity({ event: 'rate_limit.exceeded', userId: session.user.discordId, path: '/api/characters/import' })
    return rateLimitRes
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Importação não configurada (ANTHROPIC_API_KEY ausente).' }, { status: 503 })
  }

  const formData = await req.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Formato inválido.' }, { status: 400 })

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 })

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: `Arquivo muito grande (máx 5MB).` }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const mime   = file.type.toLowerCase()
  const name   = file.name.toLowerCase()
  let rawText  = ''

  try {
    if (mime === 'application/pdf' || name.endsWith('.pdf')) {
      // Validação de magic bytes — rejeita arquivos que não são realmente PDFs
      if (!isPdf(buffer)) {
        logSecurity({ event: 'api.import_failed', userId: session.user.discordId, details: { reason: 'invalid_magic_bytes_pdf' } })
        return NextResponse.json({ error: 'Arquivo não é um PDF válido.' }, { status: 400 })
      }
      const parsed = await Promise.race<{ text: string }>([
        new PDFParse({ data: buffer }).getText(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), PARSE_TIMEOUT),
        ),
      ])
      rawText = parsed.text.slice(0, MAX_TEXT_LEN)
    } else if (mime === 'text/html' || name.endsWith('.html') || name.endsWith('.htm')) {
      if (!isHtml(buffer)) {
        logSecurity({ event: 'api.import_failed', userId: session.user.discordId, details: { reason: 'invalid_magic_bytes_html' } })
        return NextResponse.json({ error: 'Arquivo não é um HTML válido.' }, { status: 400 })
      }
      rawText = extractFromHtml(buffer.toString('utf8'))
    } else {
      return NextResponse.json({ error: 'Formato não suportado. Envie PDF ou HTML.' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Erro ao ler o arquivo.' }, { status: 422 })
  }

  if (!rawText.trim()) {
    return NextResponse.json({ error: 'Nenhum texto encontrado no arquivo.' }, { status: 422 })
  }

  logSecurity({ event: 'api.import_used', userId: session.user.discordId })

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let extracted: {
    characterName: string | null
    systemHint: string | null
    attributes: { name: string; value: number | null }[]
  }

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      // system e user separados — previne prompt injection
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: rawText }],
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    extracted = JSON.parse(content.text) as typeof extracted
    if (!Array.isArray(extracted.attributes)) throw new Error('Invalid shape')
  } catch {
    logSecurity({ event: 'api.import_failed', userId: session.user.discordId, details: { reason: 'ai_parse_error' } })
    return NextResponse.json(
      { error: 'Não foi possível interpretar a ficha. Tente um arquivo diferente.' },
      { status: 422 },
    )
  }

  // Validação e sanitização rigorosa do output da IA
  if (extracted.characterName !== null && extracted.characterName !== undefined) {
    extracted.characterName = String(extracted.characterName).trim().slice(0, MAX_NAME_LEN) || null
  }
  if (extracted.systemHint !== null && extracted.systemHint !== undefined) {
    extracted.systemHint = String(extracted.systemHint).trim().slice(0, MAX_NAME_LEN) || null
  }

  extracted.attributes = extracted.attributes
    .slice(0, MAX_ATTRIBUTES)
    .filter(a => typeof a.name === 'string' && a.name.trim().length > 0)
    .map(a => ({
      name: a.name.trim().slice(0, MAX_NAME_LEN),
      value:
        typeof a.value === 'string'  ? parseValue(a.value) :
        typeof a.value === 'number' && isFinite(a.value) ? a.value :
        null,
    }))

  return NextResponse.json(extracted)
}
