import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { redirect } from 'next/navigation'
import { Perfil } from '@/components/screens/perfil/Perfil'
import type { PerfilDados } from '@/components/screens/perfil/vals'
import { haQuanto } from '@/lib/tempo'

export default async function PerfilPage({ searchParams }: { searchParams: { aba?: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const u = await prisma.user.findUnique({
    where: { discordId: session.user.discordId },
    select: {
      username: true, avatar: true, updatedAt: true,
      memberships: { select: { role: true, campaign: { select: { name: true, system: { select: { name: true } }, sessions: { select: { startedAt: true, endedAt: true, isActive: true } } } } } },
    },
  }).catch(() => null)
  if (!u) redirect('/login')

  const [rolagens, vintes] = await Promise.all([
    prisma.rollLog.count({ where: { rolledBy: u.username, NOT: { expression: 'chat' } } }).catch(() => 0),
    // Vinte natural: rolagem de d20 com um 20 entre os dados.
    prisma.rollLog.count({ where: { rolledBy: u.username, expression: { contains: 'd20' }, rolls: { array_contains: [20] } } }).catch(() => 0),
  ])
  const agora = Date.now()
  const sessoes = u.memberships.flatMap(m => m.campaign.sessions)
  const ms = sessoes.reduce((n, s) => n + ((s.endedAt?.getTime() ?? (s.isActive ? agora : s.startedAt.getTime())) - s.startedAt.getTime()), 0)

  // Sistemas favoritos = os que mais aparecem nas suas campanhas.
  const uso = new Map<string, number>()
  u.memberships.forEach(m => { const n = m.campaign.system?.name; if (n) uso.set(n, (uso.get(n) ?? 0) + 1) })
  const clientId = process.env.DISCORD_CLIENT_ID

  const dados: PerfilDados = {
    nome: session.user.displayName || u.username, user: u.username, avatar: u.avatar,
    stats: { sessoes: sessoes.length, horas: Math.round(ms / 3600000), rolagens, vintes },
    // TODO(api): títulos conquistados. Hoje: um por campanha que você mestra, mais o título inicial.
    titulos: ['Cronista Iniciante', ...u.memberships.filter(m => m.role === 'GM').map(m => `Mestre de ${m.campaign.name}`)],
    favs: [...uso.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n),
    ultimaSync: haQuanto(u.updatedAt, agora),
    inviteUrl: clientId ? `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=2147485696&scope=bot+applications.commands` : null,
    aba: ['perfil', 'conexoes', 'conta', 'pref'].includes(searchParams.aba ?? '') ? searchParams.aba! : 'perfil',
  }
  return <Perfil dados={dados} />
}
