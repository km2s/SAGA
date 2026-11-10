/** Tipos e leitura do inventário (sem "use client": a página do servidor também usa). */
export type Item = { id: string; ic: string; n: string; d: string; q: number; w: number; ty: string; eq: 0 | 1; ca?: number }
export type Moedas = { pc: number; pp: number; pe: number; po: number; pl: number }
export type InvInicial = { itens: Item[]; moedas: Moedas; xp: number; hist: { w: string; v: number }[] }

/** Lê o que veio do banco (tolerante a JSON velho ou quebrado). */
export function lerInventario(inv: string | null, moedas: string | null, xp: number, hist: string | null): InvInicial {
  const j = <T,>(raw: string | null, fb: T): T => { try { return raw ? JSON.parse(raw) as T : fb } catch { return fb } }
  const m = j<Partial<Moedas>>(moedas, {})
  return {
    itens: j<Item[]>(inv, []).filter(i => i && typeof i.n === 'string'),
    moedas: { pc: m.pc ?? 0, pp: m.pp ?? 0, pe: m.pe ?? 0, po: m.po ?? 0, pl: m.pl ?? 0 },
    xp, hist: j<{ w: string; v: number }[]>(hist, []).slice(0, 5),
  }
}

