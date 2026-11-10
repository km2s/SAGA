import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { notFound, redirect } from 'next/navigation'
import { Notas } from '@/components/screens/notas/Notas'
import type { NotasDados } from '@/components/screens/notas/vals'
import { haQuanto } from '@/lib/tempo'

export default async function NotesPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const member = await prisma.campaignMember.findFirst({
    where: { campaignId: params.id, user: { discordId: session.user.discordId } },
    select: { role: true, userId: true, user: { select: { username: true } }, campaign: { select: { id: true, name: true } } },
  }).catch(() => null)
  if (!member) notFound()
  const gm = member.role === 'GM'

  // Mesma regra do GET /api/campaigns/[id]/notes: campanha, as próprias privadas e, para o mestre, "Só o Mestre".
  const notes = await prisma.note.findMany({
    where: {
      campaignId: member.campaign.id,
      OR: [{ visibility: 'CAMPAIGN' }, { visibility: 'PRIVATE', authorId: member.userId }, ...(gm ? [{ visibility: 'GM_ONLY' as const }] : [])],
    },
    select: { id: true, title: true, content: true, visibility: true, createdAt: true, author: { select: { username: true } } },
    orderBy: { createdAt: 'desc' },
  }).catch(() => [])

  const agora = Date.now()
  const dados: NotasDados = {
    campaignId: member.campaign.id, campanha: member.campaign.name, souMestre: gm, eu: member.user.username,
    notas: notes.map(n => ({ id: n.id, t: n.title || 'Sem título', x: n.content, vis: n.visibility, u: n.author.username, when: haQuanto(n.createdAt, agora) })),
  }
  return <Notas dados={dados} />
}
