import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { redirect } from 'next/navigation'
import { Explorar } from '@/components/screens/explorar/Explorar'
import type { ExplorarDados } from '@/components/screens/explorar/vals'
import { freqLabel } from '@/lib/campanha-labels'
import { haQuanto } from '@/lib/tempo'

// Valores gravados em contentTone/playStyle (Nova Campanha e o modal antigo).
const TOM: Record<string, string> = { epic: 'Épico', dark: 'Sombrio', horror: 'Terror', political: 'Político', adventure: 'Aventura', lighthearted: 'Leve' }
const ESTILO: Record<string, string> = { roleplay: 'Roleplay', combat: 'Combate', exploration: 'Exploração', mystery: 'Mistério', sandbox: 'Sandbox', drama: 'Drama', comedy: 'Comédia', horror: 'Terror' }
const STATUS: Record<string, [string, string]> = { pending: ['Aguardando', 'var(--gold)'], approved: ['Aceita', 'var(--ok)'], rejected: ['Recusada', 'var(--muted)'] }

function estilos(json: string | null): string[] {
  try { const v = JSON.parse(json ?? '[]'); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [] } catch { return [] }
}

export default async function ExplorarPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const me = await prisma.user.findUnique({ where: { discordId: session.user.discordId }, select: { id: true } }).catch(() => null)
  if (!me) redirect('/login')

  const [abertas, cartas, meus] = await Promise.all([
    prisma.campaign.findMany({
      where: { isOpen: true, archivedAt: null, members: { none: { userId: me.id } } },
      orderBy: { updatedAt: 'desc' }, take: 60,
      select: {
        id: true, name: true, description: true, campaignType: true, sessionFrequency: true, contentTone: true, playStyle: true, minExperience: true, maxSlots: true,
        system: { select: { name: true } },
        members: { select: { role: true, user: { select: { username: true } } } },
      },
    }).catch(() => []),
    prisma.campaignApplication.findMany({ where: { userId: me.id }, orderBy: { createdAt: 'desc' }, take: 8, select: { status: true, createdAt: true, campaign: { select: { name: true } } } }).catch(() => []),
    prisma.characterSheet.findMany({
      where: { member: { userId: me.id } },
      select: { id: true, name: true, class: true, level: true, sheetSystem: { select: { name: true } }, member: { select: { campaign: { select: { system: { select: { name: true } } } } } } },
    }).catch(() => []),
  ])

  const agora = Date.now()
  const dados: ExplorarDados = {
    mesas: abertas.map(c => {
      const jogadores = c.members.filter(m => m.role === 'PLAYER').length
      return {
        id: c.id, n: c.name, sys: c.system?.name ?? 'Sistema próprio',
        fmt: c.campaignType === 'oneshot' ? 'One-shot' : 'Campanha',
        gm: c.members.find(m => m.role === 'GM')?.user.username ?? '—',
        taken: jogadores, tot: Math.max(c.maxSlots ?? jogadores + 1, jogadores),
        when: freqLabel(c.campaignType, c.sessionFrequency),
        newbie: !c.minExperience || c.minExperience === 'none' || c.minExperience === 'beginner',
        tags: [c.contentTone ? TOM[c.contentTone] : null, ...estilos(c.playStyle).map(s => ESTILO[s])].filter(Boolean).join(' · '),
        d: c.description ?? '',
      }
    }),
    cartas: cartas.map(a => ({ n: a.campaign.name, s: `Enviada ${haQuanto(a.createdAt, agora)}`, st: (STATUS[a.status] ?? STATUS.pending)[0], dot: (STATUS[a.status] ?? STATUS.pending)[1] })),
    personagens: meus.map(p => ({ id: p.id, t: p.name, d: [p.class, `Nv ${p.level}`].filter(Boolean).join(' · '), sys: p.sheetSystem?.name ?? p.member.campaign.system?.name ?? '' })),
    discord: `@${session.user.username}`,
  }
  return <Explorar dados={dados} />
}
