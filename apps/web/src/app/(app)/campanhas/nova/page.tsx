import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { redirect } from 'next/navigation'
import { NovaCampanha } from '@/components/screens/novacampanha/NovaCampanha'
import type { NovaCampanhaDados } from '@/components/screens/novacampanha/vals'
import { dadoBase } from '@/lib/system-dado'

export default async function NovaCampanhaPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const sistemas = await prisma.rPGSystem.findMany({
    where: { OR: [{ isPreset: true }, { creator: { discordId: session.user.discordId } }] },
    orderBy: [{ isPreset: 'desc' }, { createdAt: 'asc' }],
    select: { id: true, name: true, category: true, isPreset: true, _count: { select: { attributes: true } } },
  }).catch(() => [])

  const dados: NovaCampanhaDados = {
    sistemas: sistemas.map(s => ({
      id: s.id, n: s.name, cat: s.category, die: dadoBase(s.name), attrs: s._count.attributes,
      meta: s.isPreset ? 'Oficial' : 'Seu homebrew',
    })),
  }
  return <NovaCampanha dados={dados} />
}
