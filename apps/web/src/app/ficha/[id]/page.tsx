import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { FichaPublica } from '@/components/screens/fichapublica/FichaPublica'
import type { FichaPublicaDados } from '@/components/screens/fichapublica/vals'
import { parseResources, parseTracks, TRACK_COLORS, trackValue } from '@/lib/resource-tracks'

const ORDEM = ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma']

/**
 * Ficha pública: retrato, campanha, sistema, barras de recurso e atributos
 * (o mesmo que a página antiga mostrava). Privada ou inexistente → "selada";
 * o dono vê a barra para publicar ou esconder.
 */
export default async function PublicCharacterPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const char = await prisma.characterSheet.findUnique({
    where: { id: params.id },
    include: {
      sheetSystem: { select: { name: true, category: true } },
      member: { include: { user: { select: { discordId: true } }, campaign: { select: { name: true, resourceTracksJson: true, system: { select: { name: true, category: true } } } } } },
      attributes: { include: { attribute: { select: { id: true, name: true } } } },
    },
  }).catch(() => null)

  const dono = !!char && char.member.user.discordId === session?.user.discordId
  let dados: FichaPublicaDados = null
  if (char && (char.isPublic || dono)) {
    const sys = char.sheetSystem ?? char.member.campaign.system
    const attrs = [...char.attributes].sort((a, b) => {
      const ia = ORDEM.indexOf(a.attribute.name), ib = ORDEM.indexOf(b.attribute.name)
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.attribute.id.localeCompare(b.attribute.id)
    })
    const res = parseResources(char.resourcesJson)
    dados = {
      id: char.id, dono, publica: char.isPublic,
      nome: char.name, sub: [char.race, char.class].filter(Boolean).join(' · '), nivel: `Nível ${char.level}`,
      campanha: char.member.campaign.name, sistema: sys?.name ?? 'Sistema próprio', img: char.imageUrl,
      tracks: parseTracks(char.member.campaign.resourceTracksJson).map(t => {
        const v = trackValue(t, char.hp, char.maxHp, res)
        return { n: t.label, v: v.current, max: v.max, color: TRACK_COLORS[t.color]?.hex ?? 'var(--ok)' }
      }),
      attrs: attrs.slice(0, 6).map(a => ({ n: a.attribute.name, v: a.value, fantasia: sys?.category === 'fantasy' })),
    }
  }
  return <FichaPublica dados={dados} />
}
