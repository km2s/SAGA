import type { ChangeEvent } from 'react'
import type { LucideIcon } from 'lucide-react'

/* Formas que o markup de SAGA Pecas de Ficha consome (components/ficha-sistema/Pecas.tsx). */

type Ev = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
export type Dot = { t: string; bg: string; ring: string; go: () => void }
export type Seg = { l: string; t: string; bg: string; color: string; sh: string; go: () => void }
export type Row = {
  n: string; sub: string; edit: boolean; fixed: boolean; onN: Ev
  hasDots: boolean; dots: Dot[]; hasSeg: boolean; seg: Seg[]
  hasIn: boolean; inV: string; onIn: Ev; hasStep: boolean; stepV: string; dn: () => void; up: () => void
  hasVal: boolean; val: string; valC: string; hasRoll: boolean; rollL: string; roll: () => void; hasDel: boolean; del: () => void
}
export type Cell = { t: string; lab: string; cap: string; hasCap: boolean; capC: string; w: string; h: string; fs: string; r: string; ring: string; bg: string; fg: string; go: () => void }
export type Act = { l: string; icon: LucideIcon; go: () => void }
export type Track = { n: string; d: string; hasD: boolean; val: string; vc: string; gap: string; cells: Cell[]; acts: Act[]; hasActs: boolean }
export type Chip = { l: string; t: string; on: boolean; hasDot: boolean; dot: string; bg: string; color: string; ring: string; go: () => void }
export type Step = { l: string; v: string | number; of: string; vc: string; hasBar: boolean; pct: number; barC: string; dn: () => void; up: () => void; hasRoll: boolean; roll: () => void; rollT: string }
export type Field = { l: string; v: string; on: Ev; long: boolean; short: boolean; rows: number; ph: string; span: string }
export type TCell = { l: string; min: string; font: string; v: string; on: Ev }
export type TRow = { cells: TCell[]; atk: () => void; dmg: () => void; del: () => void }
export type Card = { t: string; onT: Ev; tag: string; del: () => void; x: string; onX: Ev; chks: { t: string; on: boolean; bg: string; go: () => void }[]; hasRoll: boolean; roll: () => void; rollL: string; ring: string; bg: string }
export type Group = { l: string; hasL: boolean; rows: Row[] }
export type W = {
  l: string; hasL: boolean; min: string
  isText: boolean; isRows: boolean; isBox: boolean; isChips: boolean; isStep: boolean; isTable: boolean; isCards: boolean
  hasAdd: boolean; addL: string; add: () => void; hasFoot: boolean; foot: string; hasActs: boolean; acts: Act[]
  fields: Field[]; groups: Group[]; tracks: Track[]; chips: Chip[]; steps: Step[]; head: string[]; trs: TRow[]; cards: Card[]
}

const nada = () => {}
const evNada: Ev = () => {}
export function R(o: Partial<Row>): Row {
  const r: Row = { n: '', sub: '', edit: false, fixed: true, onN: evNada, hasDots: false, dots: [], hasSeg: false, seg: [], hasIn: false, inV: '', onIn: evNada, hasStep: false, stepV: '', dn: nada, up: nada, hasVal: false, val: '', valC: 'var(--ink)', hasRoll: false, rollL: '', roll: nada, hasDel: false, del: nada, ...o }
  r.fixed = !r.edit
  return r
}
export function W(o: Partial<W>): W {
  return { l: '', hasL: !!o.l, min: '210px', isText: false, isRows: false, isBox: false, isChips: false, isStep: false, isTable: false, isCards: false, hasAdd: false, addL: '', add: nada, hasFoot: false, foot: '', hasActs: false, acts: [], fields: [], groups: [], tracks: [], chips: [], steps: [], head: [], trs: [], cards: [], ...o }
}
