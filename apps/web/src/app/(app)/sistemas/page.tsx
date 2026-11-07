import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { redirect } from 'next/navigation'
import { Sistemas } from '@/components/screens/sistemas/Sistemas'
import type { SistemasDados } from '@/components/screens/sistemas/vals'
import { dadoBase } from '@/lib/system-dado'
import { seedAndGetSystems } from '@/lib/systems-seed'

export default async function SistemasPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  // Garante os pré-definidos (o seed roda uma vez, como no GET /api/systems).
  await seedAndGetSystems().catch(() => null)
  const sistemas = await prisma.rPGSystem.findMany({
    where: { OR: [{ isPreset: true }, { creatorId: { not: null } }] },
    orderBy: [{ isPreset: 'desc' }, { createdAt: 'asc' }],
    select: {
      id: true, name: true, description: true, category: true, isPreset: true,
      creator: { select: { username: true, discordId: true } },
      attributes: { orderBy: { id: 'asc' }, select: { name: true, defaultDie: true } },
      _count: { select: { campaigns: true } },
    },
  }).catch(() => [])

  const dados: SistemasDados = {
    sistemas: sistemas.map(s => {
      // Dado da lombada: o do mapa dos pré-definidos ou o mais comum entre os atributos.
      const freq = new Map<string, number>()
      s.attributes.forEach(a => freq.set(a.defaultDie, (freq.get(a.defaultDie) ?? 0) + 1))
      const comum = [...freq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
      const mapa = dadoBase(s.name)
      return {
        id: s.id, n: s.name, cat: s.category, official: s.isPreset, d: s.description ?? '',
        attrs: s.attributes.map(a => [a.name, a.defaultDie] as [string, string]),
        die: mapa !== '—' ? mapa : comum, uses: s._count.campaigns,
        author: s.creator?.username ?? null, mine: s.creator?.discordId === session.user.discordId,
      }
    }),
  }
  return <Sistemas dados={dados} />
}
