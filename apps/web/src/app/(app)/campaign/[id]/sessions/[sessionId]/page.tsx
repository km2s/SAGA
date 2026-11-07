import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { notFound, redirect } from 'next/navigation'
import { Sessao } from '@/components/screens/sessao/Sessao'
import type { SessaoDados } from '@/components/screens/sessao/vals'
import { TZ } from '@/lib/tempo'

function duracao(startedAt: Date, endedAt: Date | null) {
  const ms = (endedAt ?? new Date()).getTime() - startedAt.getTime()
  const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
const nat20 = (expr: string, rolls: number[]) => /^1d20/i.test(expr) && rolls[0] === 20
const nat1 = (expr: string, rolls: number[]) => /^1d20/i.test(expr) && rolls[0] === 1

export default async function SessionDetailPage({ params }: { params: { id: string; sessionId: string } }) {
  const auth = await getServerSession(authOptions)
  if (!auth) redirect('/login')

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, members: { select: { role: true, user: { select: { discordId: true } } } }, sessions: { orderBy: { startedAt: 'asc' }, select: { id: true } } },
  }).catch(() => null)
  if (!campaign) notFound()
  const me = campaign.members.find(m => m.user.discordId === auth.user.discordId)
  if (!me) notFound()

  const s = await prisma.session.findUnique({
    where: { id: params.sessionId },
    include: { summary: true, rollLogs: { where: { NOT: { expression: 'chat' } }, orderBy: { rolledAt: 'desc' } } },
  }).catch(() => null)
  if (!s || s.campaignId !== params.id) notFound()

  const n = campaign.sessions.findIndex(x => x.id === s.id) + 1
  const rolls = s.rollLogs.map(r => ({ ...r, dados: Array.isArray(r.rolls) ? (r.rolls as number[]) : [] }))
  const maior = rolls.reduce<typeof rolls[number] | null>((a, r) => (!a || r.total > a.total ? r : a), null)
  const contagem = new Map<string, number>()
  rolls.forEach(r => contagem.set(r.rolledBy, (contagem.get(r.rolledBy) ?? 0) + 1))
  let naMesa = contagem.size
  try { const live = JSON.parse(s.liveMembersJson ?? '[]'); if (Array.isArray(live)) naMesa = Math.max(naMesa, live.length) } catch { /* sem presença salva */ }
  const hora = (d: Date) => d.toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
  const titulo = s.name ?? s.summary?.content.match(/^# (.+)$/m)?.[1] ?? `Sessão ${n}`

  const dados: SessaoDados = {
    campaignId: campaign.id, sessionId: s.id, campanha: campaign.name, souMestre: me.role === 'GM',
    sessaoN: `Sessão ${n}`, estado: `Sessão ${n} · ${s.isActive ? 'ao vivo' : 'encerrada'}`, titulo, duracao: duracao(s.startedAt, s.endedAt),
    resumo: s.summary?.content ?? '',
    stats: { rolagens: rolls.length, criticos: rolls.filter(r => nat20(r.expression, r.dados)).length, maior: maior?.total ?? null, naMesa },
    destaque: maior ? { t: `@${maior.rolledBy} rolou ${maior.total}${maior.attribute ? ` em ${maior.attribute}` : ''}`, d: `${maior.expression} · [${maior.dados.join(', ')}] · maior rolagem da noite`, total: maior.total } : null,
    rollers: [...contagem.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([u, c]) => ({ u, n: c })),
    log: rolls.slice(0, 200).map(r => ({
      u: r.rolledBy, what: r.attribute ?? r.expression, e: r.expression, d: r.dados.join(', '), t: r.total, h: hora(r.rolledAt),
      crit: nat20(r.expression, r.dados), um: nat1(r.expression, r.dados),
    })),
  }
  return <Sessao dados={dados} />
}
