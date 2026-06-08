import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { prisma } from 'database'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const campaigns = await prisma.campaign.findMany({
    where: { members: { some: { user: { discordId: session.user.discordId } } } },
    select: { id: true, name: true },
    orderBy: { updatedAt: 'desc' },
  }).catch(() => [])

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar campaigns={campaigns} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
