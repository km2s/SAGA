import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { notFound, redirect } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { NotesActions } from '@/components/notes/NotesActions'

export default async function NotesPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const campaign = await prisma.campaign.findUnique({ where: { id: params.id } }).catch(() => null)
  if (!campaign) notFound()

  const user = await prisma.user.findUnique({ where: { discordId: session.user.discordId } }).catch(() => null)
  if (!user) redirect('/login')

  const member = await prisma.campaignMember.findFirst({
    where: { userId: user.id, campaignId: campaign.id },
  }).catch(() => null)
  if (!member) notFound()

  const isGM = member.role === 'GM'

  const notes = await prisma.note.findMany({
    where: {
      campaignId: campaign.id,
      OR: [
        { authorId: user.id },
        { visibility: 'CAMPAIGN' },
        ...(isGM ? [{ visibility: 'GM_ONLY' as const }] : []),
      ],
    },
    include: { author: true },
    orderBy: { createdAt: 'desc' },
  }).catch(() => [])

  const visLabel: Record<string, { label: string; variant: 'muted' | 'purple' | 'gold' }> = {
    PRIVATE:  { label: 'Privada',    variant: 'muted' },
    CAMPAIGN: { label: 'Campanha',   variant: 'purple' },
    GM_ONLY:  { label: 'Só Mestre', variant: 'gold' },
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-cinzel text-xl font-semibold">Notas</h1>
          <p className="text-sm text-ink-soft mt-1">{campaign.name}</p>
        </div>
        <NotesActions campaignId={params.id} isGM={isGM} />
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-16 text-ink-soft text-sm">
          Nenhuma nota ainda. Clique em &quot;+ Nova Nota&quot; para começar.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {notes.map(note => {
            const vis = visLabel[note.visibility]
            return (
              <div key={note.id} className="bg-[#f5ecd6] border border-ink/20 rounded-lg p-5 flex flex-col gap-3 card-hover cursor-pointer">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-cinzel text-sm font-semibold text-ink leading-snug">
                    {note.title ?? 'Sem título'}
                  </p>
                  <Badge variant={vis.variant}>{vis.label}</Badge>
                </div>
                <p className="text-[13px] text-ink-soft leading-relaxed line-clamp-4">
                  {note.content}
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-ink/20">
                  <p className="text-[11px] text-ink-soft">{note.author.username}</p>
                  <p className="text-[11px] text-ink-soft">
                    {new Date(note.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
