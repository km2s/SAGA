import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from 'database'
import { SystemDetailView } from '@/components/systems/SystemDetailView'

export default async function SystemDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const system = await prisma.rPGSystem.findUnique({
    where: { id: params.id },
    include: {
      attributes: { orderBy: { name: 'asc' } },
      creator: { select: { username: true, discordId: true } },
    },
  }).catch(() => null)

  if (!system) redirect('/systems')

  return (
    <SystemDetailView
      system={system}
      currentUserDiscordId={session.user.discordId}
    />
  )
}
