import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from 'database'
import { EditarSistema } from '@/components/screens/editarsistema/EditarSistema'
import type { EditarSistemaDados } from '@/components/screens/editarsistema/vals'

/**
 * SAGA Editar Sistema: só o dono de um códice da comunidade edita. Oficiais e
 * códices de outras pessoas abrem na estante (/sistemas?id=), com Clonar e editar.
 */
export default async function SystemDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const s = await prisma.rPGSystem.findUnique({
    where: { id: params.id },
    select: {
      id: true, name: true, description: true, isPreset: true,
      creator: { select: { username: true, discordId: true } },
      attributes: { orderBy: [{ order: 'asc' }, { name: 'asc' }], select: { id: true, name: true, defaultDie: true } },
      _count: { select: { campaigns: true } },
    },
  }).catch(() => null)
  if (!s) redirect('/sistemas')
  if (s.isPreset || s.creator?.discordId !== session.user.discordId) redirect(`/sistemas?id=${s.id}`)

  const mesas = s._count.campaigns
  const dados: EditarSistemaDados = {
    id: s.id, nome: s.name, descricao: s.description ?? '',
    meta: ['Comunidade', `por ${s.creator.username}`, mesas ? `usado em ${mesas} mesa${mesas === 1 ? '' : 's'}` : 'ainda sem mesas'].join(' · '),
    attrs: s.attributes.map(a => ({ id: a.id, n: a.name, d: a.defaultDie })),
  }
  return <EditarSistema dados={dados} />
}
