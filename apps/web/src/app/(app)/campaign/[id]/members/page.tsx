import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { notFound, redirect } from 'next/navigation'
import { Membros } from '@/components/screens/membros/Membros'
import type { MembrosDados } from '@/components/screens/membros/vals'
import { mesAno, ONLINE_MS } from '@/lib/campanha-labels'
import { hasHpTrack, parseTracks } from '@/lib/resource-tracks'
import { haQuanto } from '@/lib/tempo'

// Online < 60 s do último sinal; "ausente" até 30 min; depois, offline.
const AUSENTE_MS = 30 * 60_000

export default async function CampaignMembersPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const c = await prisma.campaign.findUnique({
    where: { id: params.id },
    select: {
      id: true, name: true, resourceTracksJson: true, system: { select: { id: true, name: true } },
      members: {
        orderBy: { joinedAt: 'asc' },
        select: { id: true, role: true, joinedAt: true, lastSeenAt: true, user: { select: { username: true, discordId: true } }, character: { select: { id: true, name: true, race: true, class: true, level: true, hp: true, maxHp: true } } },
      },
    },
  }).catch(() => null)
  if (!c) notFound()
  const me = c.members.find(m => m.user.discordId === session.user.discordId)
  if (!me) notFound()

  const agora = Date.now()
  const status = (d: Date | null): 'on' | 'away' | 'off' => (!d ? 'off' : agora - d.getTime() < ONLINE_MS ? 'on' : agora - d.getTime() < AUSENTE_MS ? 'away' : 'off')
  const gm = c.members.find(m => m.role === 'GM')
  const gmSt = gm ? status(gm.lastSeenAt) : 'off'

  const dados: MembrosDados = {
    campaignId: c.id, campanha: c.name, sistema: c.system?.name ?? null, sistemaId: c.system?.id ?? null,
    souMestre: me.role === 'GM', eu: session.user.username,
    mestre: {
      nome: gm?.user.username ?? '—',
      linha: gm ? `@${gm.user.username} · ${gmSt === 'on' ? 'online agora' : gm.lastSeenAt ? `visto ${haQuanto(gm.lastSeenAt, agora)}` : 'offline'} · narrando desde ${mesAno(gm.joinedAt)}` : '',
    },
    usaHp: hasHpTrack(parseTracks(c.resourceTracksJson)),
    jogadores: c.members.filter(m => m.role === 'PLAYER').map(m => ({
      memberId: m.id, u: m.user.username,
      c: m.character?.name ?? null,
      cls: m.character ? [m.character.race, m.character.class, `Nv ${m.character.level}`].filter(Boolean).join(' · ') : null,
      hp: m.character?.hp ?? 0, max: m.character?.maxHp ?? 0,
      st: status(m.lastSeenAt), quando: m.lastSeenAt ? haQuanto(m.lastSeenAt, agora) : 'nunca',
      fichaId: m.character?.id ?? null,
    })),
  }
  return <Membros dados={dados} />
}
