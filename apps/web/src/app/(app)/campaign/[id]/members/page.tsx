import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { notFound, redirect } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'

export default async function CampaignMembersPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: {
      members: {
        include: {
          user: true,
          character: true,
        },
        orderBy: { role: 'asc' },
      },
    },
  }).catch(() => null)

  if (!campaign) notFound()

  const myMembership = campaign.members.find(m => m.user.discordId === session.user.discordId)
  if (!myMembership) notFound()

  const gm = campaign.members.find(m => m.role === 'GM')
  const players = campaign.members.filter(m => m.role !== 'GM')

  return (
    <div className="p-4 sm:p-8 sm:pt-5">
      <h2 className="font-cinzel text-lg font-semibold mb-4">Membros da Campanha</h2>

      {/* GM */}
      {gm && (
        <div className="mb-6">
          <p className="text-[11px] text-saga-muted font-bold uppercase tracking-widest mb-2">Mestre</p>
          <MemberCard member={gm} isMe={gm.user.discordId === session.user.discordId} />
        </div>
      )}

      {/* Players */}
      <div>
        <p className="text-[11px] text-saga-muted font-bold uppercase tracking-widest mb-2">
          Jogadores · {players.length}
        </p>
        {players.length === 0 ? (
          <div className="text-sm text-saga-muted bg-surface border border-border rounded-lg px-4 py-10 text-center">
            Nenhum jogador ainda. Use o comando <code className="font-mono text-gold">/campanha entrar</code> no Discord.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {players.map(m => (
              <MemberCard key={m.id} member={m} isMe={m.user.discordId === session.user.discordId} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MemberCard({ member, isMe }: { member: any; isMe: boolean }) {
  const avatar = member.user.avatar
  const initial = member.user.username[0]?.toUpperCase()

  return (
    <div className="flex items-center gap-3 bg-surface border border-border rounded-lg p-4 hover:border-border-bright transition-all card-hover">
      <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-purple to-gold flex items-center justify-center text-sm font-bold">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt={member.user.username} className="w-full h-full object-cover" />
        ) : (
          initial
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium truncate">{member.user.username}</p>
          {member.role === 'GM' && <Badge variant="gold">Mestre</Badge>}
          {isMe && <Badge variant="purple">Você</Badge>}
        </div>
        <p className="text-[11px] text-saga-muted mt-0.5">
          {member.character
            ? `${member.character.name} · ${member.character.race ?? ''} ${member.character.class ?? ''} · Nv.${member.character.level}`.trim()
            : 'Sem personagem criado'}
        </p>
      </div>
      {member.character && (
        <div className="text-right shrink-0">
          <p className="text-[11px] text-saga-muted">HP</p>
          <p className="text-sm font-bold text-saga-success">
            {member.character.hp}/{member.character.maxHp}
          </p>
        </div>
      )}
    </div>
  )
}
