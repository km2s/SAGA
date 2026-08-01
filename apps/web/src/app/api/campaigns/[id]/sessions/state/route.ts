import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'
import { validateImageUrlOrError } from '@/lib/validate-url'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { logSecurity } from '@/lib/security-log'

const TOKENS_JSON_MAX_BYTES  = 200_000
const MARKERS_JSON_MAX_BYTES = 10_000
const MARKERS_MAX_COUNT      = 50

function isValidTokensJson(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return false
    return parsed.every(t =>
      t !== null &&
      typeof t === 'object' &&
      typeof t.id === 'string' &&
      typeof t.x === 'number' &&
      typeof t.y === 'number' &&
      isFinite(t.x) &&
      isFinite(t.y),
    )
  } catch {
    return false
  }
}

function isValidMarkersJson(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return false
    if (parsed.length > MARKERS_MAX_COUNT) return false
    return parsed.every(m =>
      m !== null &&
      typeof m === 'object' &&
      typeof m.x === 'number' &&
      typeof m.y === 'number' &&
      isFinite(m.x) &&
      isFinite(m.y) &&
      (m.color  === undefined || (typeof m.color === 'string'  && m.color.length  <= 20)) &&
      (m.id     === undefined || (typeof m.id    === 'string'  && m.id.length     <= 64)),
    )
  } catch {
    return false
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit por membro
  const rateLimitRes = applyRateLimit(
    `state:${session.user.discordId}:${params.id}`,
    RATE_LIMITS.sessionState,
  )
  if (rateLimitRes) {
    logSecurity({ event: 'rate_limit.exceeded', userId: session.user.discordId, campaignId: params.id, path: '/api/campaigns/[id]/sessions/state' })
    return rateLimitRes
  }

  const member = await prisma.campaignMember.findFirst({
    where: { campaignId: params.id, user: { discordId: session.user.discordId } },
  }).catch(() => null)
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const isGM = member.role === 'GM'

  const activeSession = await prisma.session.findFirst({
    where: { campaignId: params.id },
    orderBy: { startedAt: 'desc' },
  }).catch(() => null)
  if (!activeSession) return NextResponse.json({ error: 'Nenhuma sessão encontrada' }, { status: 404 })

  const body = await req.json().catch(() => ({})) as {
    tokensJson?:      string | null
    musicYoutubeId?:  string | null
    musicVolume?:     number
    mapImageUrl?:     string | null
    liveMembersJson?: string | null
    markersJson?:     string | null
  }

  const data: Record<string, unknown> = {}

  if ('tokensJson' in body) {
    if (!isGM) {
      const currentLive = activeSession.liveMembersJson
        ? (JSON.parse(activeSession.liveMembersJson) as string[])
        : []
      if (!currentLive.includes(member.id)) {
        logSecurity({ event: 'auth.forbidden', userId: session.user.discordId, campaignId: params.id, details: { action: 'token_sync_no_live_permission' } })
        return NextResponse.json({ error: 'Sem permissão para sincronizar ao vivo' }, { status: 403 })
      }
    }

    if (body.tokensJson === null) {
      data.tokensJson = null
    } else if (typeof body.tokensJson === 'string') {
      if (Buffer.byteLength(body.tokensJson, 'utf8') > TOKENS_JSON_MAX_BYTES) {
        return NextResponse.json({ error: 'tokensJson excede o tamanho máximo permitido' }, { status: 413 })
      }
      if (!isValidTokensJson(body.tokensJson)) {
        return NextResponse.json({ error: 'tokensJson inválido' }, { status: 400 })
      }
      if (isGM) {
        data.tokensJson = body.tokensJson
      } else {
        type TR = Record<string, unknown> & { id: string; x: number; y: number }
        const existing: TR[] = (() => { try { return JSON.parse(activeSession.tokensJson ?? '[]') } catch { return [] } })()
        const incoming: TR[] = JSON.parse(body.tokensJson)
        const merged = incoming.map(t => {
          const prev = existing.find(e => e.id === t.id)
          return prev ? { ...prev, x: t.x, y: t.y } : t
        })
        data.tokensJson = JSON.stringify(merged)
      }
    }
  }

  // Qualquer membro pode enviar marcadores/pings — mas estrutura é validada
  if ('markersJson' in body) {
    if (body.markersJson === null) {
      data.markersJson = null
    } else if (typeof body.markersJson === 'string') {
      if (Buffer.byteLength(body.markersJson, 'utf8') > MARKERS_JSON_MAX_BYTES) {
        return NextResponse.json({ error: 'markersJson excede o tamanho máximo' }, { status: 413 })
      }
      if (!isValidMarkersJson(body.markersJson)) {
        return NextResponse.json({ error: 'markersJson inválido' }, { status: 400 })
      }
      data.markersJson = body.markersJson
    }
  }

  if (isGM) {
    if ('liveMembersJson' in body) {
      if (body.liveMembersJson === null) {
        data.liveMembersJson = null
      } else if (typeof body.liveMembersJson === 'string') {
        try {
          const parsed = JSON.parse(body.liveMembersJson) as unknown
          if (!Array.isArray(parsed) || !parsed.every(id => typeof id === 'string')) throw new Error()
          data.liveMembersJson = body.liveMembersJson
        } catch {
          return NextResponse.json({ error: 'liveMembersJson inválido' }, { status: 400 })
        }
      }
    }
    if ('musicYoutubeId' in body) {
      const ytId = body.musicYoutubeId
      if (ytId !== null && ytId !== undefined) {
        const match = String(ytId).match(/[a-zA-Z0-9_-]{11}/)
        data.musicYoutubeId = match ? match[0] : null
      } else {
        data.musicYoutubeId = null
      }
    }
    if ('musicVolume' in body && typeof body.musicVolume === 'number') {
      data.musicVolume = Math.max(0, Math.min(100, Math.round(body.musicVolume)))
    }
    if ('mapImageUrl' in body) {
      if (body.mapImageUrl === null || body.mapImageUrl === undefined) {
        data.mapImageUrl = null
      } else {
        const { value, error } = validateImageUrlOrError(body.mapImageUrl, 'mapImageUrl')
        if (error) {
          return NextResponse.json({ error }, { status: 400 })
        }
        data.mapImageUrl = value
      }
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  const updated = await prisma.session.update({
    where: { id: activeSession.id },
    data,
    select: {
      tokensJson: true,
      musicYoutubeId: true,
      musicVolume: true,
      mapImageUrl: true,
      liveMembersJson: true,
      markersJson: true,
    },
  })

  return NextResponse.json(updated)
}
