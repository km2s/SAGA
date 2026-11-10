import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, modoRolagem } from 'database'
import { redirect } from 'next/navigation'
import { Mensagens } from '@/components/screens/mensagens/Mensagens'
import type { MensagensDados, Registro } from '@/components/screens/mensagens/vals'
import { SEL_MSG, naoLidas, registro } from '@/lib/mensagens'
import { proximasDe, rotuloData } from '@/lib/convite'

export default async function MensagensPage({ searchParams }: { searchParams: { campanha?: string; com?: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const me = await prisma.user.findUnique({ where: { discordId: session.user.discordId }, select: { id: true } }).catch(() => null)
  if (!me) redirect('/login')

  const memberships = await prisma.campaignMember.findMany({
    where: { userId: me.id },
    orderBy: { campaign: { updatedAt: 'desc' } },
    select: {
      id: true, role: true,
      character: { select: { name: true } },
      campaign: {
        select: {
          id: true, name: true, recado: true, recadoEm: true, system: { select: { name: true } },
          members: { select: { role: true, userId: true, user: { select: { username: true, avatar: true } } } },
          // Canal = mensagens da campanha + registro da sessão ativa (ou da última, só leitura).
          sessions: { orderBy: { startedAt: 'desc' }, take: 1, select: { id: true, name: true, isActive: true } },
          handouts: { where: { imageUrl: { not: null } }, orderBy: { createdAt: 'desc' }, take: 2, select: { imageUrl: true } },
        },
      },
    },
  }).catch(() => [])

  const campIds = memberships.map(m => m.campaign.id)
  const sessionIds = memberships.map(m => m.campaign.sessions[0]?.id).filter((x): x is string => !!x)
  const sel = { ...SEL_MSG, deId: true, paraId: true } as const
  const [logs, msgsCamp, msgsDm, nao, prox] = await Promise.all([
    sessionIds.length ? prisma.rollLog.findMany({ where: { sessionId: { in: sessionIds } }, orderBy: { rolledAt: 'desc' }, take: 40 * sessionIds.length }).catch(() => []) : [],
    // Sussurros só para quem mandou e quem recebe.
    campIds.length ? prisma.mensagem.findMany({ where: { campaignId: { in: campIds }, OR: [{ paraId: null }, { deId: me.id }, { paraId: me.id }] }, orderBy: { createdAt: 'desc' }, take: 40 * campIds.length, select: sel }).catch(() => []) : [],
    prisma.mensagem.findMany({ where: { campaignId: null, OR: [{ deId: me.id }, { paraId: me.id }] }, orderBy: { createdAt: 'desc' }, take: 400, select: sel }).catch(() => []),
    naoLidas(me.id),
    proximasDe(campIds),
  ])

  // Diretas: quem divide alguma campanha com você (as conversas com mensagem primeiro).
  const pessoas = new Map<string, { n: string; avatar: string | null }>()
  for (const m of memberships) for (const x of m.campaign.members) if (x.userId !== me.id && !pessoas.has(x.userId)) pessoas.set(x.userId, { n: x.user.username, avatar: x.user.avatar })
  const outroDe = (m: { deId: string; paraId: string | null }) => (m.deId === me.id ? m.paraId! : m.deId)
  const ultimaDm = new Map<string, number>()
  for (const m of msgsDm) { const o = outroDe(m); if (!ultimaDm.has(o)) ultimaDm.set(o, m.createdAt.getTime()) }

  const dados: MensagensDados = {
    eu: session.user.username,
    diretas: [...pessoas.entries()]
      .sort((a, b) => (ultimaDm.get(b[0]) ?? 0) - (ultimaDm.get(a[0]) ?? 0) || a[1].n.localeCompare(b[1].n))
      .slice(0, 30)
      .map(([uid, p]) => ({
        id: `dm:${uid}`, tipo: 'dm' as const, n: p.n, sys: 'Mensagem direta', mestre: '', souMestre: false, membros: 2, personagem: null, recado: null, jogadores: [],
        aoVivo: null, proxima: null, handouts: [], avatar: p.avatar,
        registros: msgsDm.filter(m => outroDe(m) === uid).slice(0, 60).reverse().map(m => ({ ...registro(m), fonte: 'msg' as const })),
      })),
    canais: memberships.map(m => {
      const s = m.campaign.sessions[0]
      const p = prox.get(m.campaign.id)
      // Rolagens privadas: no canal só entra o que este membro vê com resultado.
      const daSessao: Registro[] = logs.filter(l => l.sessionId === s?.id && (l.expression === 'chat' || modoRolagem(l, { memberId: m.id, username: session.user.username, gm: m.role === 'GM' }) === 'full')).slice(0, 40).map(l => ({
        id: l.id, rolledBy: l.rolledBy, expression: l.expression, attribute: l.attribute, total: l.total, rolls: l.rolls, rolledAt: l.rolledAt.toISOString(),
      }))
      const doCanal: Registro[] = msgsCamp.filter(x => x.campaignId === m.campaign.id).slice(0, 40).map(x => ({ ...registro(x), fonte: 'msg' as const }))
      return {
        id: m.campaign.id, tipo: 'camp' as const, n: m.campaign.name, sys: m.campaign.system?.name ?? 'Sistema próprio',
        mestre: m.campaign.members.find(x => x.role === 'GM')?.user.username ?? '', souMestre: m.role === 'GM',
        membros: m.campaign.members.length, personagem: m.character?.name ?? null,
        aoVivo: s?.isActive ? s.name ?? 'sessão em andamento' : null,
        proxima: p ? `${p.titulo} · ${rotuloData(p)}` : null, avatar: null,
        recado: m.campaign.recado ? { texto: m.campaign.recado, em: m.campaign.recadoEm?.toISOString() ?? null } : null,
        // Para quem o mestre pode sussurrar (todos menos ele).
        jogadores: m.role === 'GM' ? m.campaign.members.filter(x => x.userId !== me.id).map(x => ({ id: x.userId, u: x.user.username })) : [],
        registros: [...daSessao, ...doCanal].sort((a, b) => a.rolledAt.localeCompare(b.rolledAt)).slice(-60),
        handouts: m.campaign.handouts.map(h => h.imageUrl!).filter(Boolean),
      }
    }),
    naoLidas: nao,
    inicial: searchParams.com ? `dm:${searchParams.com}` : searchParams.campanha ?? null,
  }
  return <Mensagens dados={dados} />
}
