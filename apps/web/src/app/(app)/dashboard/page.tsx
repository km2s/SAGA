import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { redirect } from 'next/navigation'
import { Inicio } from '@/components/screens/inicio/Inicio'
import type { InicioDados } from '@/components/screens/inicio/vals'
import { roman } from '@/lib/roman'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const memberships = await prisma.campaignMember.findMany({
    where: { user: { discordId: session.user.discordId } },
    include: {
      character: { select: { id: true, name: true } },
      campaign: {
        include: {
          system: { select: { name: true } },
          _count: { select: { sessions: true } },
          sessions: { where: { isActive: true }, orderBy: { startedAt: 'desc' }, take: 1, select: { id: true, name: true, startedAt: true } },
          members: {
            orderBy: { joinedAt: 'asc' },
            select: { role: true, user: { select: { username: true } }, character: { select: { name: true, hp: true, maxHp: true } } },
          },
          applications: { where: { status: 'pending' }, orderBy: { createdAt: 'asc' }, select: { id: true, characterDesc: true, user: { select: { username: true } } } },
        },
      },
    },
    orderBy: { campaign: { updatedAt: 'desc' } },
  }).catch(() => [])

  const live = memberships.find(m => m.campaign.sessions.length > 0)
  const liveSession = live?.campaign.sessions[0]

  const dados: InicioDados = {
    nome: session.user.displayName || session.user.username,
    aoVivo: live && liveSession ? {
      campaignId: live.campaign.id,
      campanha: live.campaign.name,
      sessao: liveSession.name || `Sessão ${roman(live.campaign._count.sessions)}`,
      startedAt: liveSession.startedAt.toISOString(),
      grupo: live.campaign.members
        .filter(m => m.role === 'PLAYER' && m.character)
        .map(m => ({ n: m.character!.name, hp: m.character!.hp, mx: m.character!.maxHp })),
    } : null,
    campanhas: memberships.map(m => ({
      id: m.campaign.id,
      nome: m.campaign.name,
      sistema: m.campaign.system?.name ?? null,
      sessoes: m.campaign._count.sessions,
      mestre: m.role === 'GM',
      membros: m.campaign.members.map(x => x.user.username),
      aoVivo: m.campaign.sessions.length > 0,
    })),
    // Inscrições pendentes só nas campanhas em que você é o mestre.
    inscricoes: memberships.filter(m => m.role === 'GM').flatMap(m => m.campaign.applications.map(a => ({
      id: a.id, campaignId: m.campaign.id, who: a.user.username, camp: m.campaign.name, desc: a.characterDesc,
    }))),
    personagens: memberships.filter(m => m.character).map(m => ({ id: m.character!.id, nome: m.character!.name, campanha: m.campaign.name })),
  }

  return <Inicio dados={dados} />
}
