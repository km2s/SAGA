import { prisma } from 'database'

/** Conversa: "<campaignId>" (canal da campanha) ou "dm:<userId>" (direta). */
export type Conversa = { tipo: 'camp'; campaignId: string } | { tipo: 'dm'; outroId: string }

/** Registro no formato do canal da tela Mensagens (igual ao chat do RollLog). */
export type RegistroMsg = { id: string; rolledBy: string; expression: 'chat'; attribute: string; total: 0; rolls: never[]; rolledAt: string; personagem: string | null }

/**
 * Confere se o usuário pode falar nesta conversa: membro da campanha, ou
 * (direta) alguém com quem divide alguma campanha. Sem isso, qualquer um mandaria DM.
 */
export async function conversaDe(meuId: string, conversa: string): Promise<Conversa | null> {
  if (conversa.startsWith('dm:')) {
    const outroId = conversa.slice(3)
    if (!outroId || outroId === meuId) return null
    const junto = await prisma.campaignMember.findFirst({
      where: { userId: outroId, campaign: { members: { some: { userId: meuId } } } }, select: { id: true },
    }).catch(() => null)
    return junto ? { tipo: 'dm', outroId } : null
  }
  const m = await prisma.campaignMember.findFirst({ where: { userId: meuId, campaignId: conversa }, select: { id: true } }).catch(() => null)
  return m ? { tipo: 'camp', campaignId: conversa } : null
}

export const ondeConversa = (meuId: string, c: Conversa) => c.tipo === 'camp'
  ? { campaignId: c.campaignId }
  : { campaignId: null, OR: [{ deId: meuId, paraId: c.outroId }, { deId: c.outroId, paraId: meuId }] }

type Linha = { id: string; texto: string; personagem: string | null; createdAt: Date; de: { username: string } }
export const registro = (m: Linha): RegistroMsg => ({
  id: m.id, rolledBy: m.de.username, expression: 'chat', attribute: m.texto, total: 0, rolls: [], rolledAt: m.createdAt.toISOString(), personagem: m.personagem,
})

export async function lerMensagens(meuId: string, c: Conversa, since?: Date, take = 60) {
  const xs = await prisma.mensagem.findMany({
    where: { ...ondeConversa(meuId, c), ...(since ? { createdAt: { gt: since } } : {}) },
    orderBy: { createdAt: 'desc' }, take,
    select: { id: true, texto: true, personagem: true, createdAt: true, de: { select: { username: true } } },
  }).catch(() => [])
  return xs.reverse().map(registro)
}

/** Não lidas por conversa (mensagens de outros depois da última leitura). */
export async function naoLidas(meuId: string): Promise<Record<string, number>> {
  const [camps, leituras] = await Promise.all([
    prisma.campaignMember.findMany({ where: { userId: meuId }, select: { campaignId: true } }).catch(() => []),
    prisma.leitura.findMany({ where: { userId: meuId }, select: { conversa: true, lidoEm: true } }).catch(() => []),
  ])
  const lido = new Map(leituras.map(l => [l.conversa, l.lidoEm]))
  // Sem leitura registrada, conta só os últimos 14 dias (não acende tudo de uma vez).
  const desde = (k: string) => lido.get(k) ?? new Date(Date.now() - 14 * 86400_000)
  const out: Record<string, number> = {}
  const recentes = await prisma.mensagem.findMany({
    where: {
      deId: { not: meuId }, createdAt: { gt: new Date(Date.now() - 60 * 86400_000) },
      OR: [{ campaignId: { in: camps.map(c => c.campaignId) } }, { campaignId: null, paraId: meuId }],
    },
    select: { campaignId: true, deId: true, createdAt: true }, take: 2000,
  }).catch(() => [])
  for (const m of recentes) {
    const k = m.campaignId ?? `dm:${m.deId}`
    if (m.createdAt > desde(k)) out[k] = (out[k] ?? 0) + 1
  }
  return out
}

export async function marcarLida(meuId: string, conversa: string) {
  await prisma.leitura.upsert({
    where: { userId_conversa: { userId: meuId, conversa } },
    update: { lidoEm: new Date() }, create: { userId: meuId, conversa },
  }).catch(() => null)
}
