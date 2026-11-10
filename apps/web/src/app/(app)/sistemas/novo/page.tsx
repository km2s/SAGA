import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { prisma } from 'database'
import { authOptions } from '@/lib/auth'
import { CriarSistema } from '@/components/screens/criarsistema/CriarSistema'

export default async function NovoSistemaPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  // "Começar a partir de outros sistemas": pré-definidos e os seus (só atributos, não perícias).
  const sistemas = await prisma.rPGSystem.findMany({
    where: { OR: [{ isPreset: true }, { creator: { discordId: session.user.discordId } }] },
    orderBy: [{ isPreset: 'desc' }, { name: 'asc' }], take: 40,
    select: { id: true, name: true, attributes: { where: { tipo: 'atributo' }, orderBy: [{ order: 'asc' }, { name: 'asc' }], select: { name: true } } },
  }).catch(() => [])
  const fontes = sistemas.filter(s => s.attributes.length).map(s => ({ id: s.id, n: s.name, attrs: s.attributes.map(a => a.name) }))
  return <CriarSistema fontes={fontes} />
}
