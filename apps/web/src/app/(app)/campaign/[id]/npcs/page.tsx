import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { GMActions } from '@/components/gm/GMActions'
import { DeleteNPCButton } from '@/components/gm/DeleteNPCButton'
import { NpcFolderControls } from '@/components/gm/NpcFolderControls'
import { NpcFolderSelect } from '@/components/gm/NpcFolderSelect'
import { MarkTutorialVisited } from '@/components/tutorial/MarkTutorialVisited'
import { ShieldAlert, UserCheck, Heart, Wind, User, Pencil, Folder, FolderOpen } from 'lucide-react'
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

type NpcRow = {
  id: string; name: string; type: string; description: string | null
  imageUrl: string | null; isPublic: boolean; folderId: string | null
  linkedMember: { user: { username: string } } | null
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
  const npcs = (isGM
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
      }).catch(() => [])) as unknown as NpcRow[]

  // Pastas (apenas o GM organiza NPCs em pastas)
  const folders = isGM
    ? await prisma.npcFolder.findMany({
        where: { campaignId: params.id },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, name: true },
      }).catch(() => [])
    : []

  const folderOptions = folders.map(f => ({ id: f.id, name: f.name }))

  const typeIcon = (type: string) =>
    type === 'VILLAIN' ? <ShieldAlert size={40} /> :
    type === 'ALLY'    ? <UserCheck size={40} /> :
    type === 'FAMILIAR'? <Heart size={40} /> :
    type === 'MOUNT'   ? <Wind size={40} /> :
    <User size={40} />

  const renderCard = (npc: NpcRow) => (
    <div key={npc.id} className="relative group bg-[#f5ecd6] border border-ink/20 rounded-lg overflow-hidden hover:border-wax transition-all card-hover">
      <Link href={`/campaign/${params.id}/npcs/${npc.id}`} className="block">
        {safeImageUrl(npc.imageUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={safeImageUrl(npc.imageUrl)!} alt={npc.name} className="w-full h-36 object-cover" />
        ) : (
          <div className="w-full h-36 bg-parchment/60 flex items-center justify-center text-ink-soft/40">
            {typeIcon(npc.type)}
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
            <p className="text-[12px] text-ink-soft mt-2 line-clamp-3">{npc.description}</p>
          )}
          {npc.linkedMember && (
            <p className="text-[11px] text-ink-soft mt-2 border-t border-ink/20 pt-2">
              Ligado a: <span className="text-ink">{npc.linkedMember.user.username}</span>
            </p>
          )}
        </div>
      </Link>
      {isGM && (
        <NpcFolderSelect campaignId={params.id} npcId={npc.id} folders={folderOptions} currentFolderId={npc.folderId} />
      )}
      {isGM && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            href={`/campaign/${params.id}/npcs/${npc.id}`}
            className="p-1.5 rounded bg-[#f5ecd6]/80 backdrop-blur-sm text-ink-soft hover:text-ink hover:bg-[#f5ecd6] transition-colors"
            title="Editar NPC"
          >
            <Pencil size={13} />
          </Link>
          <div className="bg-[#f5ecd6]/80 backdrop-blur-sm rounded">
            <DeleteNPCButton campaignId={params.id} npcId={npc.id} npcName={npc.name} />
          </div>
        </div>
      )}
    </div>
  )

  const gridClass = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
  const unfiled = npcs.filter(n => !n.folderId)

  return (
    <div className="p-4 sm:p-8 sm:pt-5">
      {isGM && <MarkTutorialVisited tutorialKey="saga_visited_npc" />}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-cinzel text-lg font-semibold">NPCs</h2>
        {isGM && <GMActions campaignId={params.id} players={players} />}
      </div>

      {isGM && (
        <NpcFolderControls
          campaignId={params.id}
          folders={folders.map(f => ({ id: f.id, name: f.name, count: npcs.filter(n => n.folderId === f.id).length }))}
        />
      )}

      {npcs.length === 0 ? (
        <div className="text-sm text-ink-soft bg-[#f5ecd6] border border-ink/20 rounded-lg px-4 py-10 text-center">
          {isGM
            ? 'Nenhum NPC criado ainda. Clique em "+ Criar NPC" para adicionar o primeiro.'
            : 'Nenhum NPC visível para você no momento.'}
        </div>
      ) : isGM && folders.length > 0 ? (
        <div className="space-y-8">
          {folders.map(folder => {
            const items = npcs.filter(n => n.folderId === folder.id)
            return (
              <section key={folder.id}>
                <h3 className="flex items-center gap-2 font-cinzel text-sm text-ink mb-3">
                  <FolderOpen size={15} className="text-wax" />
                  {folder.name}
                  <span className="text-ink-soft/60 text-xs">· {items.length}</span>
                </h3>
                {items.length > 0 ? (
                  <div className={gridClass}>{items.map(renderCard)}</div>
                ) : (
                  <p className="text-xs text-ink-soft/70 italic pl-6">Nenhum NPC nesta pasta ainda — use o seletor no card para mover.</p>
                )}
              </section>
            )
          })}
          {unfiled.length > 0 && (
            <section>
              <h3 className="flex items-center gap-2 font-cinzel text-sm text-ink mb-3">
                <Folder size={15} className="text-ink-soft" />
                Sem pasta
                <span className="text-ink-soft/60 text-xs">· {unfiled.length}</span>
              </h3>
              <div className={gridClass}>{unfiled.map(renderCard)}</div>
            </section>
          )}
        </div>
      ) : (
        <div className={gridClass}>{npcs.map(renderCard)}</div>
      )}
    </div>
  )
}
