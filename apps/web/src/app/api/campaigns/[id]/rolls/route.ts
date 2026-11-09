import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, visibilidadeValida } from 'database'
import { leitor, mestreDa, ondeVisivel, serializar, serializarTodas } from '@/lib/rolagens'
import { NextResponse } from 'next/server'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { withNoCache } from '@/lib/no-cache'
import { nevoaPublica } from '@/lib/mapas'
import { logSecurity } from '@/lib/security-log'

const DICE_RE    = /^(\d*)d(\d+)([+-]\d+)?$/i
const MAX_COUNT  = 100
const MAX_SIDES  = 1000
const MAX_MOD    = 10_000

function rollDice(expression: string): { rolls: number[]; total: number; modifier: number; isCrit: boolean } | null {
  const match = expression.match(DICE_RE)
  if (!match) return null
  const count    = parseInt(match[1] || '1')
  const sides    = parseInt(match[2]!)
  const modifier = match[3] ? parseInt(match[3]) : 0
  if (count < 1 || count > MAX_COUNT)      return null
  if (sides < 2 || sides > MAX_SIDES)      return null
  if (Math.abs(modifier) > MAX_MOD)        return null
  const rolls  = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1)
  const sum    = rolls.reduce((a, b) => a + b, 0)
  const isCrit = count === 1 && sides === 20 && rolls[0] === 20
  return { rolls, total: sum + modifier, modifier, isCrit }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [member, activeSession] = await Promise.all([
    prisma.campaignMember.findFirst({
      where: { campaignId: params.id, user: { discordId: session.user.discordId } },
    }).catch(() => null),
    prisma.session.findFirst({
      where: { campaignId: params.id, isActive: true },
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        tokensJson: true,
        musicYoutubeId: true,
        musicVolume: true,
        mapImageUrl: true,
        liveMembersJson: true,
        markersJson: true,
      },
    }).catch(() => null),
  ])
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!activeSession) {
    return withNoCache(NextResponse.json({ rolls: [], sessionState: null }))
  }

  const url   = new URL(req.url)
  const since = url.searchParams.get('since')
  let sinceDate: Date | undefined
  if (since) {
    const parsed = new Date(since)
    if (!isNaN(parsed.getTime())) sinceDate = parsed
  }

  const [rolls, gm] = await Promise.all([
    prisma.rollLog.findMany({
      where: {
        sessionId: activeSession.id,
        // "Revelar à mesa" muda uma rolagem antiga: ela volta junto com as novas.
        AND: [ondeVisivel(member.id), ...(sinceDate ? [{ OR: [{ rolledAt: { gt: sinceDate } }, { revealedAt: { gt: sinceDate } }] }] : [])],
      },
      orderBy: { rolledAt: 'desc' },
      take: 30,
    }).catch(() => []),
    mestreDa(params.id),
  ])

  return withNoCache(NextResponse.json({
    // Filtro no servidor: total e dados só para quem pode ver (lib/rolagens.ts).
    rolls: serializarTodas(rolls, leitor(member, session.user.username), gm),
    sessionState: {
      tokensJson:      activeSession.tokensJson,
      musicYoutubeId:  activeSession.musicYoutubeId,
      musicVolume:     activeSession.musicVolume,
      mapImageUrl:     activeSession.mapImageUrl,
      liveMembersJson: activeSession.liveMembersJson,
      markersJson:     activeSession.markersJson,
      // Mapa na mesa (SAGA Mapas): tamanho do tabuleiro para todos.
      mapa: await (async () => {
        const c = await prisma.campaign.findUnique({ where: { id: params.id }, select: { mapaNaMesaId: true } }).catch(() => null)
        if (!c?.mapaNaMesaId) return null
        const m = await prisma.mapa.findUnique({ where: { id: c.mapaNaMesaId }, select: { id: true, nome: true, colunas: true, linhas: true, escala: true, arte: true, imagemUrl: true, nevoaJson: true } }).catch(() => null)
        // Névoa: o jogador recebe só as áreas cobertas (lib/mapas.ts); o mestre já tem a dele.
        return m ? { ...m, nevoaJson: member.role === 'GM' ? null : nevoaPublica(m.nevoaJson) } : null
      })(),
    },
  }))
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit: 120 rolagens/minuto por campanha por usuário
  const rateLimitRes = applyRateLimit(
    `roll:${session.user.discordId}:${params.id}`,
    RATE_LIMITS.diceRoll,
  )
  if (rateLimitRes) {
    logSecurity({ event: 'rate_limit.exceeded', userId: session.user.discordId, campaignId: params.id, path: '/api/campaigns/[id]/rolls' })
    return rateLimitRes
  }

  const member = await prisma.campaignMember.findFirst({
    where: { campaignId: params.id, user: { discordId: session.user.discordId } },
  }).catch(() => null)
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body      = await req.json().catch(() => ({})) as { expression?: string; attribute?: string; message?: string; adv?: string; visibility?: string }
  const rawExpr   = (body.expression ?? '1d20').trim().toLowerCase().slice(0, 30)
  const attribute = typeof body.attribute === 'string' ? body.attribute.slice(0, 80) : null

  // Mensagem de chat — armazenada com expression="chat"
  if (rawExpr === 'chat') {
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 500) : ''
    if (!message) return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })

    const activeSession = await prisma.session.findFirst({
      where: { campaignId: params.id, isActive: true },
      orderBy: { startedAt: 'desc' },
    }).catch(() => null)
    if (!activeSession) return NextResponse.json({ error: 'Nenhuma sessão ativa' }, { status: 400 })

    const rollLog = await prisma.rollLog.create({
      data: {
        expression: 'chat',
        rolls:      [],
        modifier:   0,
        total:      0,
        attribute:  message,
        rolledBy:   session.user.username,
        sessionId:  activeSession.id,
        memberId:   member.id,
      },
    })
    return NextResponse.json({ ...rollLog, isCrit: false }, { status: 201 })
  }

  const result = rollDice(rawExpr)
  // Vantagem/desvantagem (Mesa nova): só em 1d20±N. Rola um segundo d20 e
  // guarda o mantido primeiro em `rolls` (leitores usam rolls[0] como natural).
  const adv = body.adv === 'vant' || body.adv === 'desv' ? body.adv : null
  if (result && adv && /^1?d20([+-]\d+)?$/.test(rawExpr)) {
    const a = result.rolls[0]!, b = Math.floor(Math.random() * 20) + 1
    const kept = adv === 'vant' ? Math.max(a, b) : Math.min(a, b)
    result.rolls = [kept, kept === a ? b : a]
    result.total = kept + result.modifier
    result.isCrit = kept === 20
  }
  if (!result) {
    return NextResponse.json(
      { error: 'Expressão inválida. Use o formato XdY±Z (ex: 2d6+3). Máximo: 100 dados, d1000, modificador ±10000.' },
      { status: 400 },
    )
  }

  const activeSession = await prisma.session.findFirst({
    where: { campaignId: params.id, isActive: true },
    orderBy: { startedAt: 'desc' },
  }).catch(() => null)
  if (!activeSession) return NextResponse.json({ error: 'Nenhuma sessão ativa' }, { status: 400 })

  // Rolagem privada: o papel limita o modo (mestre: pública/secreta; jogador: pública/só para mim/para o Mestre/às cegas).
  const regra = member.role === 'GM' ? 'escolha' : (await prisma.campaign.findUnique({ where: { id: params.id }, select: { rollVisibility: true } }).catch(() => null))?.rollVisibility
  const visibility = visibilidadeValida(body.visibility, member.role === 'GM', regra ?? 'escolha')
  const rollLog = await prisma.rollLog.create({
    data: {
      expression: rawExpr,
      rolls:      result.rolls,
      modifier:   result.modifier,
      total:      result.total,
      attribute,
      rolledBy:   session.user.username,
      sessionId:  activeSession.id,
      visibility,
      memberId:   member.id,
    },
  })

  // Às cegas: nem quem rolou recebe o resultado.
  const gm = { memberId: member.role === 'GM' ? member.id : null, username: member.role === 'GM' ? session.user.username : null }
  const out = serializar(rollLog, leitor(member, session.user.username), gm)
  return NextResponse.json({ ...out, isCrit: out?.oculto ? false : result.isCrit }, { status: 201 })
}
