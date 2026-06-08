import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'

const CLASS_ICONS: Record<string, string> = {
  Guerreiro: '⚔️', Mago: '🔮', Paladino: '🛡️', Ladino: '🗡️', Clérigo: '✝️',
  Bárbaro: '🪓', Druida: '🌿', Bardo: '🎵', Ranger: '🏹', Monge: '👊',
}

export default async function CharactersPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { discordId: session.user.discordId },
    include: {
      members: {
        include: {
          campaign: { include: { system: true } },
          character: true,
        },
      },
    },
  }).catch(() => null)

  if (!user) redirect('/login')

  const memberships = user.members.filter(m => m.character !== null)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-cinzel text-2xl font-bold">Meus Personagens</h1>
          <p className="text-sm text-saga-muted mt-1">Fichas dos seus personagens em todas as campanhas</p>
        </div>
        <p className="text-[12px] text-saga-muted">
          Use <code className="font-mono text-gold">/ficha criar</code> no Discord para criar um personagem
        </p>
      </div>

      {memberships.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-4">🧙</div>
          <p className="font-cinzel text-lg text-saga-muted">Nenhum personagem ainda</p>
          <p className="text-sm text-saga-muted mt-1 max-w-sm">
            Entre em uma campanha e use <code className="font-mono text-gold">/ficha criar</code> no Discord para criar seu primeiro personagem.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {memberships.map(m => {
            const char = m.character!
            const classIcon = CLASS_ICONS[char.class] ?? '🧙'
            const hpPercent = Math.round((char.hp / char.maxHp) * 100)
            const hpColor = hpPercent > 60 ? 'bg-saga-success' : hpPercent > 30 ? 'bg-saga-warning' : 'bg-saga-danger'

            return (
              <Link key={m.id} href={`/campaign/${m.campaignId}`}>
                <div className="bg-surface border border-border rounded-lg overflow-hidden hover:border-border-bright transition-all card-hover">
                  {char.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={char.imageUrl} alt={char.name} className="w-full h-40 object-cover object-top" />
                  ) : (
                    <div className="w-full h-40 bg-gradient-to-br from-[#1a0533] via-[#4a1080] to-[#7c3aed] flex items-center justify-center text-5xl">
                      {classIcon}
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-cinzel font-semibold">{char.name}</h3>
                        <p className="text-[12px] text-saga-muted">{char.race ?? ''} {char.class ?? ''}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant="gold">Nv. {char.level}</Badge>
                        {m.role === 'GM' && <Badge variant="purple">Mestre</Badge>}
                      </div>
                    </div>

                    {/* HP bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] text-saga-muted mb-1">
                        <span>HP</span>
                        <span>{char.hp} / {char.maxHp}</span>
                      </div>
                      <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${hpColor}`} style={{ width: `${hpPercent}%` }} />
                      </div>
                    </div>

                    {/* Campaign */}
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-[11px] text-saga-muted truncate">
                        📖 {m.campaign.name}
                      </p>
                      {m.campaign.system && (
                        <p className="text-[10px] text-saga-dim mt-0.5">{m.campaign.system.name}</p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
