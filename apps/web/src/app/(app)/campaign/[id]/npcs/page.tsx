import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { notFound, redirect } from 'next/navigation'
import { Npcs } from '@/components/screens/npcs/Npcs'
import type { NpcsDados } from '@/components/screens/npcs/vals'
import { MarkTutorialVisited } from '@/components/tutorial/MarkTutorialVisited'

const ORDEM = ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma']
const sigla = (nome: string) => nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()

export default async function NpcsPage({ params, searchParams }: { params: { id: string }; searchParams: { npc?: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const c = await prisma.campaign.findUnique({
    where: { id: params.id },
    select: {
      id: true, name: true, system: { select: { category: true } },
      members: { orderBy: { joinedAt: 'asc' }, select: { id: true, role: true, user: { select: { username: true, discordId: true } } } },
      npcFolders: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }], select: { id: true, name: true } },
      npcs: {
        orderBy: { name: 'asc' },
        select: {
          id: true, name: true, type: true, folderId: true, level: true, hp: true, maxHp: true, isPublic: true, description: true, imageUrl: true,
          visibilities: { where: { canView: true }, select: { memberId: true } },
          attributes: { select: { value: true, attribute: { select: { id: true, name: true } } } },
        },
      },
    },
  }).catch(() => null)
  if (!c) notFound()
  const me = c.members.find(m => m.user.discordId === session.user.discordId)
  if (!me) notFound()
  const gm = me.role === 'GM'
  const fantasia = c.system?.category === 'fantasy'

  const dados: NpcsDados = {
    campaignId: c.id, campanha: c.name, souMestre: gm, selInicial: searchParams.npc ?? null,
    pastas: gm ? c.npcFolders.map(f => ({ id: f.id, n: f.name })) : [],
    jogadores: gm ? c.members.filter(m => m.role === 'PLAYER').map(m => ({ memberId: m.id, u: m.user.username })) : [],
    // Jogador só recebe os NPCs revelados para ele.
    npcs: c.npcs.filter(n => gm || n.isPublic || n.visibilities.some(v => v.memberId === me.id)).map(n => {
      const attrs = [...n.attributes].sort((a, b) => {
        const ia = ORDEM.indexOf(a.attribute.name), ib = ORDEM.indexOf(b.attribute.name)
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.attribute.id.localeCompare(b.attribute.id)
      }).slice(0, 6)
      return {
        id: n.id, n: n.name, type: n.type, folderId: gm ? n.folderId : null, lv: n.level, hp: n.hp, max: n.maxHp, publico: n.isPublic,
        d: n.description ?? '', img: n.imageUrl, vis: gm ? n.visibilities.map(v => v.memberId) : [],
        attrs: attrs.map(a => { const m = Math.floor((a.value - 10) / 2); return { k: sigla(a.attribute.name), m: fantasia ? (m >= 0 ? `+${m}` : `${m}`) : String(a.value) } }),
      }
    }),
  }
  return (
    <>
      {gm && <MarkTutorialVisited tutorialKey="saga_visited_npc" />}
      <Npcs dados={dados} />
    </>
  )
}
