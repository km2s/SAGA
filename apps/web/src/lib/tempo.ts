/** Formatação de datas no servidor: o público do Saga está no fuso de Brasília. */
export const TZ = 'America/Sao_Paulo'
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** "1 out" */
export function diaMes(d: Date): string {
  const [dia, mes] = d.toLocaleDateString('pt-BR', { timeZone: TZ, day: 'numeric', month: 'numeric' }).split('/')
  return `${+dia} ${MES[+mes - 1]}`
}

/** "3h40" */
export function duracao(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60000))
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`
}

/** "há 8 min", "há 3 h", "ontem", "há 5 dias", "1 out" */
export function haQuanto(d: Date, agora = Date.now()): string {
  const s = Math.max(0, (agora - d.getTime()) / 1000)
  if (s < 60) return 'agora'
  if (s < 3600) return `há ${Math.floor(s / 60)} min`
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`
  if (s < 172800) return 'ontem'
  if (s < 7 * 86400) return `há ${Math.floor(s / 86400)} dias`
  return diaMes(d)
}
