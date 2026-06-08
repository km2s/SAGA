import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { notFound, redirect } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'

const NPC_TYPE_LABELS: Record<string, string> = {
  VILLAIN: 'Vilão',
  ALLY: 'Aliado',
  MERCHANT: 'Mercador',
  FAMILIAR: 'Familiar',
  MOUNT: 'Montaria',
  SERVANT: 'Servo',
  NEUTRAL: 'Neutro',
  OTHER: 'Outro',
}

export default async function CampaignNpcsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: { members: { include: { user: true } } },
  }).catch(() => null)

  if (!campaign) notFound()

  const myMembership = campaign.members.find(m => m.user.discordId === session.user.discordId)
  if (!myMembership) notFound()

  const isGM = myMembership.role === 'GM'

  // GMs see all NPCs; players see only public or explicitly visible ones
  const npcs = isGM
    ? await prisma.nPC.findMany({
        where: { campaignId: params.id },
        include: { linkedMember: { include: { user: true } } },
        orderBy: { name: 'asc' },
      }).catch(() => [])
    : await prisma.nPC.findMany({
        where: {
          campaignId: params.id,
          OR: [
            { isPublic: true },
            { visibilities: { some: { memberId: myMembership.id, canView: true } } },
          ],
        },
        include: { linkedMember: { include: { user: true } } },
        orderBy: { name: 'asc' },
      }).catch(() => [])

  return (
    <div className="p-8 pt-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-cinzel text-lg font-semibold">NPCs</h2>
        {isGM && (
          <p className="text-[11px] text-saga-muted">
            Use <code className="font-mono text-gold">/npc criar</code> no Discord para adicionar NPCs
          </p>
        )}
      </div>

      {npcs.length === 0 ? (
        <div className="text-sm text-saga-muted bg-surface border border-border rounded-lg px-4 py-10 text-center">
          {isGM
            ? 'Nenhum NPC criado ainda. Use /npc criar no Discord.'
            : 'Nenhum NPC visível para você no momento.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {npcs.map(npc => (
            <div key={npc.id} className="bg-surface border border-border rounded-lg overflow-hidden hover:border-border-bright transition-all card-hover">
              {npc.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={npc.imageUrl} alt={npc.name} className="w-full h-36 object-cover" />
              ) : (
                <div className="w-full h-36 bg-surface-2 flex items-center justify-center text-4xl">
                  {npc.type === 'VILLAIN' ? '👹' : npc.type === 'ALLY' ? '🧝' : npc.type === 'FAMILIAR' ? '🐺' : npc.type === 'MOUNT' ? '🐴' : '🗿'}
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-cinzel font-semibold">{npc.name}</h3>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={npc.isPublic ? 'success' : 'muted'}>
                      {npc.isPublic ? 'Visível' : 'Restrito'}
                    </Badge>
                    <Badge variant="purple">{NPC_TYPE_LABELS[npc.type] ?? npc.type}</Badge>
                  </div>
                </div>
                {npc.description && (
                  <p className="text-[12px] text-saga-muted mt-2 line-clamp-3">{npc.description}</p>
                )}
                {npc.linkedMember && (
                  <p className="text-[11px] text-saga-muted mt-2 border-t border-border pt-2">
                    Ligado a: <span className="text-saga-text">{npc.linkedMember.user.username}</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
