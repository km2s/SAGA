import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { DashboardActions } from '@/components/campaign/DashboardActions'
import { Swords } from 'lucide-react'

const COVER_GRADIENTS = [
  'from-[#1a0533] via-[#4a1080] to-[#7c3aed]',
  'from-[#1a0a00] via-[#5c2800] to-[#c9622a]',
  'from-[#001a1a] via-[#004040] to-[#0a9090]',
  'from-[#0a1a00] via-[#2a4800] to-[#5a8800]',
]

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const memberships = await prisma.campaignMember.findMany({
    where: { user: { discordId: session.user.discordId } },
    include: {
      campaign: {
        include: {
          system: true,
          _count: { select: { members: true } },
          sessions: { where: { isActive: true }, take: 1 },
        },
      },
    },
    orderBy: { campaign: { updatedAt: 'desc' } },
  }).catch(() => [])

  const activeSessionCount = memberships.filter(m => m.campaign.sessions.length > 0).length

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-cinzel text-[11px] tracking-[0.35em] text-wax uppercase">⚜ Salão do Mestre</p>
          <h1 className="font-cinzel text-3xl font-bold text-ink mt-1">
            Bem-vindo, {session.user.username}
          </h1>
          <p className="text-sm text-ink-soft mt-1 font-cormorant italic">
            {memberships.length} campanha{memberships.length !== 1 ? 's' : ''}
            {activeSessionCount > 0 && ` · ${activeSessionCount} sessão ativa`}
          </p>
        </div>
        <DashboardActions />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
        {memberships.map((m, i) => {
          const hasSession = m.campaign.sessions.length > 0
          const gradient = COVER_GRADIENTS[i % COVER_GRADIENTS.length]

          return (
            <Link key={m.campaign.id} href={`/campaign/${m.campaign.id}`}>
              <div className="parchment-card rounded-lg overflow-hidden cursor-pointer card-hover">
                {/* Cover */}
                <div className={`h-28 bg-gradient-to-br ${gradient} relative`}>
                  <span className="pointer-events-none absolute inset-0 shadow-[inset_0_-30px_40px_-20px_rgba(51,41,29,0.5)]" />
                  {hasSession && (
                    <div className="absolute bottom-2 right-2">
                      <Badge variant="success">● Sessão ativa</Badge>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="relative p-4">
                  <p className="font-cinzel text-base font-bold text-ink mb-2 truncate">
                    {m.campaign.name}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={m.role === 'GM' ? 'gold' : 'purple'}>
                      {m.role === 'GM' ? 'Mestre' : 'Jogador'}
                    </Badge>
                    <span className="text-[11px] text-ink-soft font-cormorant">
                      {m.campaign._count.members} jogadores
                    </span>
                    {m.campaign.system && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-ink/30" />
                        <span className="text-[11px] text-ink-soft font-cormorant">{m.campaign.system.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          )
        })}

        {/* New campaign placeholder card */}
        {memberships.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
            <Swords size={48} className="text-wax/40 mb-4" />
            <p className="font-cinzel text-lg text-ink">Nenhuma campanha ainda</p>
            <p className="text-sm text-ink-soft mt-1 max-w-sm font-cormorant">
              Crie sua primeira campanha ou peça ao Mestre para te adicionar via{' '}
              <code className="font-mono text-wax">/campanha entrar</code> no Discord.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
