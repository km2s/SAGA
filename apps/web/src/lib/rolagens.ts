import { prisma, modoRolagem, ehMinha, type Leitor, type ModoRolagem, type Prisma, type RollLog } from 'database'

/** Mestre da campanha (membro e username), para marcar as rolagens dele. */
export async function mestreDa(campaignId: string): Promise<{ memberId: string | null; username: string | null }> {
  const m = await prisma.campaignMember.findFirst({ where: { campaignId, role: 'GM' }, select: { id: true, user: { select: { username: true } } } }).catch(() => null)
  return { memberId: m?.id ?? null, username: m?.user.username ?? null }
}

/**
 * Rolagens privadas no site. A regra de quem vê o quê está em `database`
 * (packages/database/src/rolagens.ts), a mesma do bot. Todo leitor de RollLog
 * que manda dados para o navegador passa por aqui: nunca sai um total que o
 * leitor não pode ver.
 */

export function leitor(member: { id: string; role: string }, username: string): Leitor {
  return { memberId: member.id, username, gm: member.role === 'GM' }
}

/** Fragmento de `where`: tira do banco o "só para mim" dos outros (os demais modos viram marcador). */
export function ondeVisivel(memberId: string): Prisma.RollLogWhereInput {
  return { OR: [{ visibility: { not: 'SELF' } }, { memberId }] }
}

/**
 * Fragmento de `where` para listas que só mostram rolagens com resultado
 * (feeds, canal, contagens): o leitor vê o total de todas que voltam.
 * Mestre: tudo menos o "só para mim" dos outros. Jogador: públicas, reveladas
 * e as próprias que não são às cegas.
 */
export function ondeResultadoVisivel(l: Leitor): Prisma.RollLogWhereInput {
  if (l.gm) return ondeVisivel(l.memberId)
  return { OR: [{ visibility: 'PUBLIC' }, { revealedAt: { not: null } }, { memberId: l.memberId, visibility: { in: ['SELF', 'GM'] } }] }
}

export interface RolagemSerializada {
  id: string; expression: string; rolls: number[]; modifier: number; total: number
  attribute: string | null; rolledBy: string; rolledAt: string
  visibility: string; mode: ModoRolagem; mine: boolean; porMestre: boolean; revealed: boolean; oculto: boolean
}

/**
 * Rolagem como o leitor pode ver. `sealed`/`ghost` saem sem dados, total nem
 * (no ghost) o que foi rolado. `hide` volta null.
 * `gm` = quem é o mestre da campanha (para "o Mestre rolou em segredo").
 */
export function serializar(r: RollLog, l: Leitor, gm: { memberId: string | null; username: string | null }): RolagemSerializada | null {
  const mode = modoRolagem(r, l)
  if (mode === 'hide') return null
  const full = mode === 'full'
  const porMestre = r.memberId ? r.memberId === gm.memberId : r.rolledBy === gm.username
  return {
    id: r.id, rolledBy: r.rolledBy, rolledAt: r.rolledAt.toISOString(),
    expression: full ? r.expression : mode === 'sealed' ? r.expression : '',
    rolls: full ? (r.rolls as number[]) : [], modifier: full ? r.modifier : 0, total: full ? r.total : 0,
    attribute: mode === 'ghost' ? null : r.attribute,
    visibility: r.revealedAt ? 'PUBLIC' : r.visibility, mode, mine: ehMinha(r, l), porMestre, revealed: !!r.revealedAt, oculto: !full,
  }
}

/** Para listas: serializa e tira as escondidas. */
export function serializarTodas(rs: RollLog[], l: Leitor, gm: { memberId: string | null; username: string | null }): RolagemSerializada[] {
  return rs.map(r => serializar(r, l, gm)).filter((x): x is RolagemSerializada => !!x)
}
