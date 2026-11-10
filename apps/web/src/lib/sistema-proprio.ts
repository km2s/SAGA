/**
 * Sistema feito por usuário (sem spec em lib/ficha-sistema): o que a Ficha
 * Personalizada precisa saber dele. Sigla, faixa e perícias vêm dos campos
 * novos de SystemAttribute; sistemas antigos guardavam na descrição
 * ("FOR · 3–18", "Perícia"), e isso também é lido.
 */
export type Mecanica = 'soma' | 'parada' | 'abaixo'
export type AtributoSis = { nome: string; sigla: string; min: number; max: number; tipo: 'atributo' | 'pericia'; base: string | null; dado: string }
export type RecursoSis = { nome: string; formula: string; cor: string }
export type SistemaProprio = { nome: string; autor: string | null; mecanica: Mecanica; atributos: AtributoSis[]; recursos: RecursoSis[] }

const MEC: Record<string, Mecanica> = { soma: 'soma', sum: 'soma', parada: 'parada', pool: 'parada', abaixo: 'abaixo', under: 'abaixo' }
export const siglaDe = (n: string) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || '?'

type AttrDb = { name: string; description: string | null; defaultDie: string; sigla?: string | null; minimo?: number | null; maximo?: number | null; tipo?: string | null; base?: string | null }
type SisDb = { name: string; category: string; mecanica?: string | null; recursosJson?: string | null; creator?: { username: string } | null; attributes: AttrDb[] }

export function montarSistema(s: SisDb): SistemaProprio {
  const atributos = s.attributes.map((a): AtributoSis => {
    const desc = a.description ?? ''
    // Formato antigo do Criar Sistema: "FOR · 3–18".
    const velho = desc.match(/^([A-Z0-9]{1,4})\s*·\s*(-?\d+)\s*[–-]\s*(-?\d+)/)
    const pericia = a.tipo === 'pericia' || /^per[ií]cia/i.test(desc)
    const min = a.minimo ?? (velho ? +velho[2]! : pericia ? 0 : 1)
    const max = a.maximo ?? (velho ? +velho[3]! : pericia ? 10 : 20)
    return { nome: a.name, sigla: (a.sigla || velho?.[1] || siglaDe(a.name)).toUpperCase(), min: Math.min(min, max), max: Math.max(min, max), tipo: pericia ? 'pericia' : 'atributo', base: a.base ?? null, dado: a.defaultDie }
  })
  let recursos: RecursoSis[] = []
  try { const r = JSON.parse(s.recursosJson ?? '[]') as unknown; if (Array.isArray(r)) recursos = r.filter(x => x && typeof x.nome === 'string').map(x => ({ nome: String(x.nome).slice(0, 40), formula: String(x.formula ?? ''), cor: typeof x.cor === 'string' ? x.cor : 'var(--ok)' })) } catch { /* sem recursos */ }
  // Sem mecânica gravada: pela categoria (mundo das trevas = parada; horror = abaixo; o resto soma).
  const mecanica = MEC[s.mecanica ?? ''] ?? (s.category === 'wod' || s.category === 'world-of-darkness' ? 'parada' : s.category === 'horror' ? 'abaixo' : 'soma')
  return { nome: s.name, autor: s.creator?.username ?? null, mecanica, atributos, recursos }
}

/**
 * Fórmula de recurso ("10 + CON", "CON × 2 + 10", "igual a FOL"): números, siglas,
 * + − × / e parênteses. Sigla desconhecida vale 0; resultado mínimo 1.
 */
export function avaliarFormula(f: string, valores: Record<string, number>): number {
  const tokens = f.replace(/igual a/gi, '').replace(/[×x*]/g, '*').replace(/[−–]/g, '-').toUpperCase().match(/\d+(?:[.,]\d+)?|[A-Z]{1,4}|[-+*/()]/g) ?? []
  let i = 0
  const prim = (): number => {
    const t = tokens[i++]
    if (t === '(') { const v = soma(); i++; return v }
    if (t === '-') return -prim()
    if (t && /^\d/.test(t)) return +t.replace(',', '.')
    return t ? valores[t] ?? 0 : 0
  }
  const prod = (): number => { let v = prim(); while (tokens[i] === '*' || tokens[i] === '/') { const op = tokens[i++]; const w = prim(); v = op === '*' ? v * w : w ? v / w : v } return v }
  const soma = (): number => { let v = prod(); while (tokens[i] === '+' || tokens[i] === '-') { const op = tokens[i++]; const w = prod(); v = op === '+' ? v + w : v - w } return v }
  try { return Math.max(1, Math.floor(soma())) } catch { return 1 }
}
