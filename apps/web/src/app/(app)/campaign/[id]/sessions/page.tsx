import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { notFound, redirect } from 'next/navigation'
import { Sessoes } from '@/components/screens/sessoes/Sessoes'
import type { SessoesDados } from '@/components/screens/sessoes/vals'
import { leitor, ondeResultadoVisivel, ondeVisivel } from '@/lib/rolagens'
import { roman } from '@/lib/roman'
import { TZ, diaMes } from '@/lib/tempo'

function dur(startedAt: Date, endedAt: Date | null) {
  const ms = (endedAt ?? new Date()).getTime() - startedAt.getTime()
  const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`
}
// Primeiro parágrafo do resumo (sem os títulos "#").
const trecho = (t: string | null | undefined) => (t ?? '').split('\n').map(l => l.trim()).find(l => l && !l.startsWith('#')) ?? ''

export default async function CampaignSessionsPage({ params }: { params: { id: string } }) {
  const auth = await getServerSession(authOptions)
  if (!auth) redirect('/login')

  const c = await prisma.campaign.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, members: { select: { id: true, role: true, user: { select: { discordId: true, username: true } } } } },
  }).catch(() => null)
  if (!c) notFound()
  const me = c.members.find(m => m.user.discordId === auth.user.discordId)
  if (!me) notFound()
  const quem = leitor(me, me.user.username)

  const sessoes = await prisma.session.findMany({
    where: { campaignId: c.id }, orderBy: { startedAt: 'asc' },
    select: { id: true, name: true, isActive: true, startedAt: true, endedAt: true, summary: { select: { content: true } } },
  }).catch(() => [])
  // Contagens com o filtro de rolagens privadas: só o que este leitor vê.
  const [rolls, crits] = await Promise.all([
    prisma.rollLog.groupBy({ by: ['sessionId'], where: { session: { campaignId: c.id }, NOT: { expression: 'chat' }, ...ondeVisivel(me.id) }, _count: { _all: true } }).catch(() => []),
    prisma.rollLog.groupBy({ by: ['sessionId'], where: { session: { campaignId: c.id }, expression: { startsWith: '1d20' }, rolls: { array_contains: [20] }, ...ondeResultadoVisivel(quem) }, _count: { _all: true } }).catch(() => []),
  ])
  const nDe = (xs: { sessionId: string; _count: { _all: number } }[], id: string) => xs.find(x => x.sessionId === id)?._count._all ?? 0
  const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: TZ })

  const dados: SessoesDados = {
    campaignId: c.id, campanha: c.name, souMestre: me.role === 'GM',
    sessoes: sessoes.map((s, i) => ({
      id: s.id, num: roman(i + 1), live: s.isActive,
      n: s.name ?? s.summary?.content.match(/^# (.+)$/m)?.[1] ?? `Sessão ${i + 1}`,
      date: s.startedAt.toLocaleDateString('pt-BR', { timeZone: TZ }) === hoje ? 'hoje' : diaMes(s.startedAt),
      d: s.isActive ? (trecho(s.summary?.content) || 'Em andamento.') : trecho(s.summary?.content),
      dur: dur(s.startedAt, s.endedAt), rolls: nDe(rolls, s.id), crits: nDe(crits, s.id),
    })).reverse(),
    totalRolagens: rolls.reduce((n, x) => n + x._count._all, 0),
  }
  return <Sessoes dados={dados} />
}
