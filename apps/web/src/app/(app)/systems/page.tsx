import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { seedAndGetSystems } from '@/lib/systems-seed'
import { SystemsView } from '@/components/systems/SystemsView'

export default async function SystemsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const systems = await seedAndGetSystems().catch(() => [])

  return (
    <SystemsView
      systems={systems}
      currentUserDiscordId={session.user.discordId}
    />
  )
}
