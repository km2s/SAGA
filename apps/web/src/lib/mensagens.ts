import { prisma } from 'database'

/** Conversa: "<campaignId>" (canal da campanha) ou "dm:<userId>" (direta). */
export type Conversa = { tipo: 'camp'; campaignId: string } | { tipo: 'dm'; outroId: string }

/** Registro no formato do canal da tela Mensagens (igual ao chat do RollLog). */
export type RegistroMsg = { id: string; rolledBy: string; expression: 'chat'; attribute: string; total: 0; rolls: never[]; rolledAt: string; personagem: string | null
  /** Sussurro selado (campanha): para quem, e quando o selo foi rompido. */
  para: string | null; aberto: boolean }

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

// Sussurro (campanha com paraId): só quem mandou e quem recebe. Os outros nem sabem que existe.
export const ondeConversa = (meuId: string, c: Conversa) => c.tipo === 'camp'
  ? { campaignId: c.campaignId, OR: [{ paraId: null }, { deId: meuId }, { paraId: meuId }] }
  : { campaignId: null, OR: [{ deId: meuId, paraId: c.outroId }, { deId: c.outroId, paraId: meuId }] }

type Linha = { id: string; texto: string; personagem: string | null; createdAt: Date; de: { username: string }; campaignId?: string | null; abertoEm?: Date | null; para?: { username: string } | null }
export const registro = (m: Linha): RegistroMsg => ({
  id: m.id, rolledBy: m.de.username, expression: 'chat', attribute: m.texto, total: 0, rolls: [], rolledAt: m.createdAt.toISOString(), personagem: m.personagem,
  para: m.campaignId && m.para ? m.para.username : null, aberto: !!m.abertoEm,
})
export const SEL_MSG = { id: true, texto: true, personagem: true, createdAt: true, campaignId: true, abertoEm: true, de: { select: { username: true } }, para: { select: { username: true } } } as const

export async function lerMensagens(meuId: string, c: Conversa, since?: Date, take = 60) {
  const xs = await prisma.mensagem.findMany({
    where: { ...ondeConversa(meuId, c), ...(since ? { createdAt: { gt: since } } : {}) },
    orderBy: { createdAt: 'desc' }, take,
    select: SEL_MSG,
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
      OR: [{ campaignId: { in: camps.map(c => c.campaignId) }, OR: [{ paraId: null }, { paraId: meuId }] }, { campaignId: null, paraId: meuId }],
    },
    select: { campaignId: true, deId: true, createdAt: true }, take: 2000,
  }).catch(() => [])
  for (const m of recentes) {
    const k = m.campaignId ?? `dm:${m.deId}`
    if (m.createdAt > desde(k)) out[k] = (out[k] ?? 0) + 1
  }
  return out
}

/** "X está escrevendo…": quem digitou na conversa nos últimos 6 s (menos você). */
export async function digitando(meuId: string, conversa: string): Promise<string[]> {
  const xs = await prisma.digitando.findMany({ where: { conversa, userId: { not: meuId }, em: { gt: new Date(Date.now() - 6000) } }, select: { userId: true } }).catch(() => [])
  if (!xs.length) return []
  const us = await prisma.user.findMany({ where: { id: { in: xs.map(x => x.userId) } }, select: { username: true, nomeExibido: true } }).catch(() => [])
  return us.map(u => u.nomeExibido || u.username)
}

export async function marcarLida(meuId: string, conversa: string) {
  await prisma.leitura.upsert({
    where: { userId_conversa: { userId: meuId, conversa } },
    update: { lidoEm: new Date() }, create: { userId: meuId, conversa },
  }).catch(() => null)
}
