import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/header/AppHeader'
import type { HeaderCampanha } from '@/components/header/SagaHeader'
import { Tour } from '@/components/screens/tour/Tour'
import { Suspense } from 'react'
import { prisma } from 'database'

const DIA = 24 * 60 * 60 * 1000

// "há 6 dias" como no atalho do header.
function haQuanto(d: Date): string {
  const dias = Math.floor((Date.now() - d.getTime()) / DIA)
  return dias <= 0 ? 'hoje' : dias === 1 ? 'ontem' : `há ${dias} dias`
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const memberships = await prisma.campaignMember.findMany({
    where: { user: { discordId: session.user.discordId } },
    select: {
      role: true,
      campaign: {
        select: {
          id: true,
          name: true,
          system: { select: { name: true } },
          sessions: { orderBy: { startedAt: 'desc' }, take: 1, select: { isActive: true, startedAt: true, endedAt: true } },
        },
      },
    },
    orderBy: { campaign: { updatedAt: 'desc' } },
  }).catch(() => [])

  const campaigns       = memberships.map(m => m.campaign)
  const gmMemberships   = memberships.filter(m => m.role === 'GM')
  const firstCampaignId = campaigns[0]?.id ?? null
  const firstGMId       = gmMemberships[0]?.campaign.id ?? null

  // Atalhos do menu "Campanhas": as 3 mais recentes, como no design.
  // TODO(api): sessões agendadas ("sábado, 20h") quando o agendamento do Painel existir.
  const atalhos: HeaderCampanha[] = memberships.slice(0, 3).map(({ role, campaign: c }) => {
    const ultima = c.sessions[0]
    const aoVivo = !!ultima?.isActive
    const quando = aoVivo ? 'sessão ao vivo agora' : ultima ? haQuanto(ultima.endedAt ?? ultima.startedAt) : null
    return {
      id: c.id,
      nome: c.name,
      meta: [c.system?.name, quando].filter(Boolean).join(' · '),
      mestre: role === 'GM',
      aoVivo,
      capa: null, // TODO(api): Campaign.coverUrl
    }
  })

  // Rito "Criar um NPC" do tour: já feito se alguma campanha sua como mestre tem NPC.
  const npcCount = gmMemberships.length
    ? await prisma.nPC.count({ where: { campaignId: { in: gmMemberships.map(m => m.campaign.id) } } }).catch(() => 0)
    : 0

  const clientId = process.env.DISCORD_CLIENT_ID
  const inviteUrl = clientId
    ? `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=2147485696&scope=bot+applications.commands`
    : null

  return (
    <div className="parchment-bg min-h-screen text-ink">
      <AppHeader campanhas={atalhos} inviteUrl={inviteUrl} />
      <main>{children}</main>
      <Suspense fallback={null}>
        <Tour dados={{ gmCampaignId: firstGMId, campaignId: firstCampaignId, temNpc: npcCount > 0 }} />
      </Suspense>
    </div>
  )
}
