import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { redirect } from 'next/navigation'
import { CriarPersonagem } from '@/components/screens/criarpersonagem/CriarPersonagem'
import type { CriarPersonagemDados } from '@/components/screens/criarpersonagem/vals'

export default async function NovoPersonagemPage({ searchParams }: { searchParams: { modo?: string; campanha?: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const memberships = await prisma.campaignMember.findMany({
    where: { user: { discordId: session.user.discordId } },
    orderBy: { campaign: { updatedAt: 'desc' } },
    select: {
      role: true, character: { select: { id: true } },
      campaign: { select: { id: true, name: true, system: { select: { name: true } }, members: { where: { role: 'GM' }, select: { user: { select: { username: true } } } } } },
    },
  }).catch(() => [])

  const dados: CriarPersonagemDados = {
    // Jogador: campanhas em que você ainda não tem personagem (uma ficha por campanha).
    jogador: memberships.filter(m => m.role === 'PLAYER' && !m.character).map(m => ({
      id: m.campaign.id, t: m.campaign.name, sistema: m.campaign.system?.name ?? null,
      d: [m.campaign.system?.name, m.campaign.members[0] ? `mestre ${m.campaign.members[0].user.username}` : null].filter(Boolean).join(' · '),
    })),
    npc: memberships.filter(m => m.role === 'GM').map(m => ({
      id: m.campaign.id, t: m.campaign.name, sistema: m.campaign.system?.name ?? null,
      d: [m.campaign.system?.name, 'você é o mestre'].filter(Boolean).join(' · '),
    })),
    modo: searchParams.modo === 'npc' ? 'npc' : 'jogador',
    campanhaInicial: searchParams.campanha ?? null,
  }
  return <CriarPersonagem dados={dados} />
}
