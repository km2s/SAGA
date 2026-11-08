import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, modoRolagem } from 'database'
import { redirect } from 'next/navigation'
import { Mensagens } from '@/components/screens/mensagens/Mensagens'
import type { MensagensDados } from '@/components/screens/mensagens/vals'

export default async function MensagensPage({ searchParams }: { searchParams: { campanha?: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const memberships = await prisma.campaignMember.findMany({
    where: { user: { discordId: session.user.discordId } },
    orderBy: { campaign: { updatedAt: 'desc' } },
    select: {
      id: true, role: true,
      character: { select: { name: true } },
      campaign: {
        select: {
          id: true, name: true, system: { select: { name: true } },
          members: { select: { role: true, user: { select: { username: true } } } },
          // Canal = registro da sessão ativa, ou da última sessão (só leitura).
          sessions: { orderBy: { startedAt: 'desc' }, take: 1, select: { id: true, name: true, isActive: true } },
          handouts: { where: { imageUrl: { not: null } }, orderBy: { createdAt: 'desc' }, take: 2, select: { imageUrl: true } },
        },
      },
    },
  }).catch(() => [])

  const sessionIds = memberships.map(m => m.campaign.sessions[0]?.id).filter((x): x is string => !!x)
  const logs = sessionIds.length
    ? await prisma.rollLog.findMany({ where: { sessionId: { in: sessionIds } }, orderBy: { rolledAt: 'desc' }, take: 40 * sessionIds.length }).catch(() => [])
    : []

  const dados: MensagensDados = {
    eu: session.user.username,
    canais: memberships.map(m => {
      const s = m.campaign.sessions[0]
      return {
        id: m.campaign.id, n: m.campaign.name, sys: m.campaign.system?.name ?? 'Sistema próprio',
        mestre: m.campaign.members.find(x => x.role === 'GM')?.user.username ?? '', souMestre: m.role === 'GM',
        membros: m.campaign.members.length, personagem: m.character?.name ?? null,
        aoVivo: s?.isActive ? s.name ?? 'sessão em andamento' : null,
        // Rolagens privadas: no canal só entra o que este membro vê com resultado.
        registros: logs.filter(l => l.sessionId === s?.id && (l.expression === 'chat' || modoRolagem(l, { memberId: m.id, username: session.user.username, gm: m.role === 'GM' }) === 'full')).slice(0, 40).reverse().map(l => ({
          id: l.id, rolledBy: l.rolledBy, expression: l.expression, attribute: l.attribute, total: l.total, rolls: l.rolls, rolledAt: l.rolledAt.toISOString(),
        })),
        handouts: m.campaign.handouts.map(h => h.imageUrl!).filter(Boolean),
      }
    }),
    inicial: searchParams.campanha ?? null,
  }
  return <Mensagens dados={dados} />
}
