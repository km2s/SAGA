import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'

const TOKENS_JSON_MAX_BYTES = 200_000 // 200 KB — suficiente para centenas de tokens

function isValidTokensJson(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return false
    // Valida estrutura mínima de cada token
    return parsed.every(t =>
      t !== null &&
      typeof t === 'object' &&
      typeof t.id === 'string' &&
      typeof t.x === 'number' &&
      typeof t.y === 'number'
    )
  } catch {
    return false
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await prisma.campaignMember.findFirst({
    where: { campaignId: params.id, user: { discordId: session.user.discordId } },
  }).catch(() => null)
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const isGM = member.role === 'GM'

  // Salva na sessão mais recente (ativa ou encerrada) — estado do canvas persiste entre sessões
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
    // Non-GM token sync requires live permission
    if (!isGM) {
      const currentLive = activeSession.liveMembersJson
        ? (JSON.parse(activeSession.liveMembersJson) as string[])
        : []
      if (!currentLive.includes(member.id)) {
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
      data.tokensJson = body.tokensJson
    }
  }

  // Any member can broadcast markers/pings
  if ('markersJson' in body) {
    if (body.markersJson === null) {
      data.markersJson = null
    } else if (typeof body.markersJson === 'string' && body.markersJson.length < 10000) {
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
        // Aceita ID curto ou URL; extrai apenas o ID alfanumérico
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
      const url = body.mapImageUrl
      if (url === null || url === undefined) {
        data.mapImageUrl = null
      } else {
        const trimmed = String(url).trim()
        if (trimmed && !/^https?:\/\//i.test(trimmed)) {
          return NextResponse.json({ error: 'mapImageUrl inválida' }, { status: 400 })
        }
        data.mapImageUrl = trimmed || null
      }
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  const updated = await prisma.session.update({
    where: { id: activeSession.id },
    data,
    select: { tokensJson: true, musicYoutubeId: true, musicVolume: true, mapImageUrl: true, liveMembersJson: true, markersJson: true },
  })

  return NextResponse.json(updated)
}
