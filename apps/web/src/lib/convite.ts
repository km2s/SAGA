import { randomInt } from 'crypto'
import { prisma } from 'database'

/** Alfabeto do selo de convite: sem 0/O, 1/I (o mesmo do Painel). */
export const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const codigoValido = (c: unknown): c is string => typeof c === 'string' && c.length === 8 && [...c].every(ch => ALFABETO.includes(ch))
export const normalizar = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '')
export const exibir = (c: string | null) => (c ? `${c.slice(0, 4)}-${c.slice(4)}` : '—')
const sortear = () => Array.from({ length: 8 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('')

/**
 * Grava um código na campanha. `pedido` (gerado no navegador) vale se estiver
 * livre; senão o servidor sorteia outro. Devolve o código gravado.
 */
export async function gravarCodigo(campaignId: string, pedido?: string | null): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const c = i === 0 && codigoValido(pedido) ? pedido : sortear()
    const ok = await prisma.campaign.update({ where: { id: campaignId }, data: { inviteCode: c }, select: { inviteCode: true } }).catch(() => null)
    if (ok?.inviteCode) return ok.inviteCode
  }
  throw new Error('Não foi possível gerar o código de convite')
}

/** Código da campanha; as campanhas antigas ganham um na primeira leitura. */
export async function codigoDa(campaignId: string, atual?: string | null): Promise<string | null> {
  if (atual) return atual
  return gravarCodigo(campaignId).catch(() => null)
}

// ── Sessões agendadas (horário de Brasília) ──
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
export const quandoDe = (data: string, horario: string) => new Date(`${data}T${horario}:00-03:00`)
export const dataValida = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(`${s}T12:00:00Z`).getTime())
export const horarioValido = (s: unknown): s is string => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s)

/** "sábado, 20h" / "sábado, 20h30" da próxima sessão agendada. */
export function rotuloAgenda(a: { data: string; horario: string }) {
  const dow = DIAS[new Date(`${a.data}T12:00:00Z`).getUTCDay()]!
  const [h, m] = a.horario.split(':')
  return `${dow}, ${+h!}h${m === '00' ? '' : m}`
}
/** "sáb., 14/11 · 20h" para listas. */
export function rotuloData(a: { data: string; horario: string }) {
  const [, mm, dd] = a.data.split('-')
  return `${rotuloAgenda(a).replace(',', ` ${dd}/${mm} ·`)}`
}

/** Próximas sessões agendadas das campanhas (ainda não passaram). */
export async function proximasDe(campaignIds: string[]) {
  if (!campaignIds.length) return new Map<string, { titulo: string; data: string; horario: string; quando: Date }>()
  const xs = await prisma.sessaoAgendada.findMany({
    where: { campaignId: { in: campaignIds }, quando: { gt: new Date(Date.now() - 3 * 3600_000) } },
    orderBy: { quando: 'asc' },
    select: { campaignId: true, titulo: true, data: true, horario: true, quando: true },
  }).catch(() => [])
  const m = new Map<string, { titulo: string; data: string; horario: string; quando: Date }>()
  for (const x of xs) if (!m.has(x.campaignId)) m.set(x.campaignId, x)
  return m
}
