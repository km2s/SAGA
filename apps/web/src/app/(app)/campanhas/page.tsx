import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { redirect } from 'next/navigation'
import { Campanhas } from '@/components/screens/campanhas/Campanhas'
import type { CampanhasDados } from '@/components/screens/campanhas/vals'
import { freqLabel, mesAno, ONLINE_MS } from '@/lib/campanha-labels'
import { roman } from '@/lib/roman'

export default async function CampanhasPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const memberships = await prisma.campaignMember.findMany({
    where: { user: { discordId: session.user.discordId } },
    include: {
      character: { select: { id: true } },
      campaign: {
        include: {
          system: { select: { name: true } },
          _count: { select: { sessions: true } },
          sessions: { where: { isActive: true }, orderBy: { startedAt: 'desc' }, take: 1, select: { name: true, startedAt: true } },
          members: {
            orderBy: { joinedAt: 'asc' },
            select: { role: true, lastSeenAt: true, user: { select: { username: true } }, character: { select: { name: true, level: true } } },
          },
        },
      },
    },
    orderBy: { campaign: { updatedAt: 'desc' } },
  }).catch(() => [])

  const agora = Date.now()
  const dados: CampanhasDados = {
    campanhas: memberships.map(({ role, character, campaign: c }) => {
      const live = c.sessions[0]
      return {
        id: c.id,
        n: c.name,
        sys: c.system?.name ?? 'Sistema próprio',
        mestre: role === 'GM',
        freq: freqLabel(c.campaignType, c.sessionFrequency),
        k: c.members.filter(m => m.role === 'PLAYER').length,
        live: live ? { sessao: `Sessão ${roman(c._count.sessions)}${live.name ? ` — ${live.name}` : ''}`, startedAt: live.startedAt.toISOString() } : null,
        ses: c._count.sessions,
        since: mesAno(c.createdAt),
        codigo: null, // TODO(api): Campaign.inviteCode (XXXX-XXXX)
        desc: c.description ?? '',
        archived: false, // TODO(api): Campaign.archivedAt
        personagemId: character?.id ?? null,
        members: c.members.map(m => ({
          u: m.user.username,
          c: m.role === 'GM' ? 'Mestre' : m.character ? `${m.character.name} · Nv ${m.character.level}` : 'Sem personagem',
          on: !!m.lastSeenAt && agora - m.lastSeenAt.getTime() < ONLINE_MS,
        })),
      }
    }),
  }

  return <Campanhas dados={dados} />
}
