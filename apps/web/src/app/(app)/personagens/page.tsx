import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { redirect } from 'next/navigation'
import { Personagens } from '@/components/screens/personagens/Personagens'
import type { PersonagensDados } from '@/components/screens/personagens/vals'
import { HP_TRACK_KEY, parseResources, parseTracks, trackValue } from '@/lib/resource-tracks'

const NPC_TIPO: Record<string, string> = { VILLAIN: 'Vilão', ENEMY: 'Vilão', ALLY: 'Aliado', MERCHANT: 'Mercador', FAMILIAR: 'Familiar' }
// "Força" → "FOR", como nas siglas do design.
const sigla = (nome: string) => nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()

export default async function PersonagensPage({ searchParams }: { searchParams: { aba?: string; importar?: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const memberships = await prisma.campaignMember.findMany({
    where: { user: { discordId: session.user.discordId } },
    orderBy: { joinedAt: 'asc' },
    include: {
      campaign: {
        select: {
          id: true, name: true, resourceTracksJson: true,
          system: { select: { name: true, category: true } },
          npcs: { orderBy: { name: 'asc' }, select: { id: true, name: true, type: true, description: true, isPublic: true, imageUrl: true } },
        },
      },
      character: {
        include: {
          sheetSystem: { select: { name: true, category: true } },
          attributes: { include: { attribute: { select: { id: true, name: true, defaultDie: true } } } },
        },
      },
    },
  }).catch(() => [])

  const chars: PersonagensDados['chars'] = memberships.filter(m => m.character).map(m => {
    const ch = m.character!
    const sys = ch.sheetSystem ?? m.campaign.system
    const attrs = [...ch.attributes].sort((a, b) => a.attribute.id.localeCompare(b.attribute.id))
    const regra = sys?.category === 'world-of-darkness' ? 'pool' : attrs.some(a => a.attribute.defaultDie.includes('d100')) ? 'pct' : 'd20'
    const extra = parseTracks(m.campaign.resourceTracksJson).find(t => t.key !== HP_TRACK_KEY)
    const val = extra ? trackValue(extra, ch.hp, ch.maxHp, parseResources(ch.resourcesJson)) : null
    return {
      id: ch.id, n: ch.name,
      sub: [ch.race, ch.class].filter(Boolean).join(' · ') || (sys?.name ?? ''),
      camp: m.campaign.name, sys: sys?.name ?? 'Sistema próprio', lv: `Nv ${ch.level}`,
      hp: ch.hp, mx: ch.maxHp, hpLabel: 'Pontos de vida',
      res: extra && val ? [extra.label, val.current, val.max] : null,
      img: ch.imageUrl, regra,
      attrs: attrs.slice(0, 6).map(a => [sigla(a.attribute.name), a.value] as [string, number]),
    }
  })

  const dados: PersonagensDados = {
    chars,
    grupos: memberships.filter(m => m.role === 'GM' && m.campaign.npcs.length).map(m => ({
      campaignId: m.campaign.id, n: m.campaign.name,
      npcs: m.campaign.npcs.map(n => ({ id: n.id, n: n.name, type: NPC_TIPO[n.type] ?? 'Neutro', d: n.description ?? '', vis: n.isPublic, img: n.imageUrl })),
    })),
    aba: searchParams.aba === 'npc' ? 'npc' : 'jogador',
  }

  return (
    <Personagens
      dados={dados}
      importar={searchParams.importar === '1'}
      campanhasSemFicha={memberships.filter(m => m.role !== 'GM' && !m.character).map(m => ({ id: m.campaign.id, name: m.campaign.name }))}
    />
  )
}
