import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from 'database'
import { SystemsView } from '@/components/systems/SystemsView'

export default async function SystemsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const systems = await prisma.rPGSystem.findMany({
    include: {
      attributes: { orderBy: { name: 'asc' } },
      creator: { select: { username: true, discordId: true } },
    },
    orderBy: [{ isPreset: 'desc' }, { name: 'asc' }],
  }).catch(() => [])

  return (
    <SystemsView
      systems={systems}
      currentUserDiscordId={session.user.discordId}
    />
  )
}
