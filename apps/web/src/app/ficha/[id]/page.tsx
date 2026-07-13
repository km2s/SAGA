import { prisma } from 'database'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'
import { safeImageUrl } from '@/lib/safe-url'
import { coverFor } from '@/lib/campaign-cover'
import {
  Swords, Sparkles, Shield, Sword, Plus, Axe, Leaf, Music, Target, Dumbbell,
  Wand2, Moon, ScrollText, User, Heart,
} from 'lucide-react'

const CLASS_ICONS: Record<string, React.ElementType> = {
  Guerreiro: Swords, Mago: Sparkles, Paladino: Shield, Ladino: Sword, Clérigo: Plus,
  Bárbaro: Axe, Druida: Leaf, Bardo: Music, Ranger: Target, Monge: Dumbbell,
  Feiticeiro: Wand2, Bruxo: Moon, Arcanista: ScrollText,
}

const ATTRIBUTE_COLORS: Record<string, string> = {
  Força: 'text-red-400', Destreza: 'text-yellow-400', Constituição: 'text-green-400',
  Inteligência: 'text-blue-400', Sabedoria: 'text-teal-400', Carisma: 'text-purple-400',
}

export default async function PublicCharacterPage({ params }: { params: { id: string } }) {
  const char = await prisma.characterSheet.findUnique({
    where: { id: params.id },
    include: {
      member: {
        include: {
          user: true,
          campaign: { include: { system: true } },
        },
      },
      attributes: {
        include: { attribute: true },
        orderBy: { attribute: { name: 'asc' } },
      },
    },
  }).catch(() => null)

  if (!char || !char.isPublic) notFound()

  const ClassIcon = CLASS_ICONS[char.class ?? ''] ?? User
  const hpPercent = Math.min(100, Math.round((char.hp / char.maxHp) * 100))
  const hpColor = hpPercent > 60 ? 'bg-saga-success' : hpPercent > 30 ? 'bg-saga-warning' : 'bg-saga-danger'

  return (
    <main className="min-h-screen bg-parchment bg-gradient-login">
      {/* Header bar */}
      <div className="border-b border-ink/20 bg-card/80 backdrop-blur-sm px-5 py-3 flex items-center justify-between">
        <Link href="/">
          <span className="font-cinzel text-lg font-bold tracking-[6px] text-gold-gradient">SAGA</span>
        </Link>
        <Link href="/login">
          <span className="text-[12px] text-ink-soft hover:text-gold transition-colors">Entrar →</span>
        </Link>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Portrait + name */}
        <div className="bg-card border border-ink/20 rounded-lg overflow-hidden mb-5">
          {safeImageUrl(char.imageUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={safeImageUrl(char.imageUrl)!} alt={char.name} className="w-full h-64 object-cover object-top" />
          ) : (
            <div className={`w-full h-48 bg-gradient-to-br ${coverFor(0)} flex items-center justify-center`}>
              <ClassIcon size={80} className="text-white/40" />
            </div>
          )}

          <div className="p-6">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="font-cinzel text-2xl font-bold">{char.name}</h1>
                <p className="text-ink-soft text-sm mt-0.5">
                  {[char.race, char.class].filter(Boolean).join(' · ')}
                </p>
              </div>
              <Badge variant="gold">Nível {char.level}</Badge>
            </div>

            {/* Campaign */}
            <div className="mt-4 pt-4 border-t border-ink/20 flex items-center justify-between text-[12px] text-ink-soft">
              <span>{char.member.campaign.name}</span>
              {char.member.campaign.system && (
                <span className="text-ink-soft">{char.member.campaign.system.name}</span>
              )}
            </div>
          </div>
        </div>

        {/* HP */}
        {char.maxHp > 0 && (
          <div className="bg-card border border-ink/20 rounded-lg p-5 mb-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-[11px] font-bold text-ink-soft uppercase tracking-widest">
                <Heart size={12} /> Pontos de Vida
              </div>
              <span className="font-cinzel text-sm font-bold text-green-700">{char.hp} / {char.maxHp}</span>
            </div>
            <div className="h-2.5 bg-parchment/60 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${hpColor} transition-all`} style={{ width: `${hpPercent}%` }} />
            </div>
          </div>
        )}

        {/* Attributes */}
        {char.attributes.length > 0 && (
          <div className="bg-card border border-ink/20 rounded-lg p-5 mb-5">
            <p className="text-[11px] font-bold text-ink-soft uppercase tracking-widest mb-4">Atributos</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {char.attributes.map(a => (
                <div key={a.id} className="bg-parchment/60 rounded-lg p-3 text-center">
                  <p className={`font-cinzel text-2xl font-bold ${ATTRIBUTE_COLORS[a.attribute.name] ?? 'text-gold'}`}>
                    {a.value >= 0 ? '+' : ''}{a.value}
                  </p>
                  <p className="text-[10px] text-ink-soft mt-1">{a.attribute.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="text-center mt-8">
          <p className="text-[12px] text-ink-soft mb-3">Criado com SAGA · Gerencie suas aventuras de RPG</p>
          <Link href="/login">
            <span className="inline-block px-5 py-2.5 rounded bg-gold/15 border border-gold/30 text-gold text-sm font-medium hover:bg-gold/15 transition-colors">
              Criar minha conta grátis
            </span>
          </Link>
        </div>
      </div>
    </main>
  )
}
