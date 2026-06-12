import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { GMActions } from '@/components/gm/GMActions'
import { DeleteNPCButton } from '@/components/gm/DeleteNPCButton'
import { MarkTutorialVisited } from '@/components/tutorial/MarkTutorialVisited'
import { ShieldAlert, UserCheck, Heart, Wind, User, Pencil } from 'lucide-react'
import { safeImageUrl } from '@/lib/safe-url'

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
  const players = campaign.members.filter(m => m.role !== 'GM')

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
    <div className="p-4 sm:p-8 sm:pt-5">
      {isGM && <MarkTutorialVisited tutorialKey="saga_visited_npc" />}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-cinzel text-lg font-semibold">NPCs</h2>
        {isGM && <GMActions campaignId={params.id} players={players} />}
      </div>

      {npcs.length === 0 ? (
        <div className="text-sm text-saga-muted bg-surface border border-border rounded-lg px-4 py-10 text-center">
          {isGM
            ? 'Nenhum NPC criado ainda. Clique em "+ Criar NPC" para adicionar o primeiro.'
            : 'Nenhum NPC visível para você no momento.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {npcs.map(npc => (
            <div key={npc.id} className="relative group bg-surface border border-border rounded-lg overflow-hidden hover:border-border-bright transition-all card-hover">
              <Link href={`/campaign/${params.id}/npcs/${npc.id}`} className="block">
                {safeImageUrl(npc.imageUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={safeImageUrl(npc.imageUrl)!} alt={npc.name} className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 bg-surface-2 flex items-center justify-center text-saga-muted/40">
                    {npc.type === 'VILLAIN' ? <ShieldAlert size={40} /> :
                     npc.type === 'ALLY'    ? <UserCheck size={40} /> :
                     npc.type === 'FAMILIAR'? <Heart size={40} /> :
                     npc.type === 'MOUNT'   ? <Wind size={40} /> :
                     <User size={40} />}
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
              </Link>
              {isGM && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/campaign/${params.id}/npcs/${npc.id}`}
                    className="p-1.5 rounded bg-surface/80 backdrop-blur-sm text-saga-muted hover:text-saga-text hover:bg-surface transition-colors"
                    title="Editar NPC"
                  >
                    <Pencil size={13} />
                  </Link>
                  <div className="bg-surface/80 backdrop-blur-sm rounded">
                    <DeleteNPCButton campaignId={params.id} npcId={npc.id} npcName={npc.name} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
