/**
 * Spec de cada sistema na Ficha por Sistema. Todos os campos apontam para os
 * dados que as fichas antigas (components/character/sheets/*) já gravavam.
 */

/** Seleciona atributos da ficha: pelo prefixo da descrição do seed ("Habilidade Social —") ou pelo nome. */
export type Sel = { prefixo?: string[]; nomes?: string[] }
export type Regra = 'v5' | 'wod' | 'cod' | 'd20' | 'pf2' | 'coc' | 'pct' | 'ms' | 'dw' | 'isw' | 'fate' | 'bitd' | 'sr' | 'cpr' | 'sw' | 'savage' | 'gurps'
export type Familia = 'dots' | 'd20' | 'pct' | 'pbta' | 'narr' | 'pool' | 'step'

/** Atributos principais (bloco do topo da moldura). */
export type Atributos =
  | { tipo: 'bolinhas'; grupos: { l: string; sel: Sel }[]; max?: number }
  | { tipo: 'tiles'; sel: Sel; mostra: 'mod' | 'valor' | 'pct' | 'dado' | 'sinal' }

/** Quantidade que uma trilha mostra/grava. */
export type Fonte =
  | { attr: string[] }                          // valor de um atributo (o primeiro nome que existir)
  | { tf: string; label: string; gasto?: true }  // número num campo de texto (gasto = marca o que foi usado)
  | { pv: true }                                 // vida da ficha (hp/maxHp)
/** soma: atributos somados (cada um pelo primeiro nome que existir) + `mais` (ex.: Vitalidade V5 = Vigor + 3). */
export type Maximo = number | { attr: string[] } | { soma: string[][]; mais?: number } | { pv: true }
export type Trilha =
  | { n: string; forma: 'dot' | 'box'; fonte: Fonte; max: Maximo; d?: string; sangue?: boolean }
  | { n: string; forma: 'bar' | 'num'; fonte: Fonte; max: Maximo; d?: string }
  | { n: string; forma: 'estados'; tf: string; label: string; max: Maximo; d?: string } // CSV 0/1/2 (vazia, superficial, agravado)

export type Peca =
  | { tipo: 'texto'; campos: [key: string, label: string, longo?: boolean][] }
  | { tipo: 'linhas'; l?: string; grupos: { l?: string; sel: Sel }[]; bolinhas?: number; adicionar?: { label: string; descricao: string; dado: string }; min?: string }
  | { tipo: 'armas' }
  | { tipo: 'chips'; l: string; tf: string; label: string; opcoes: string[] }
  | { tipo: 'trilhas'; trilhas: Trilha[] }

export type SistemaSpec = {
  familia: Familia; regra: Regra
  /** Linha abaixo do nome: chaves de texto, na ordem ("Toreador · 13ª geração"). */
  linha: string[]
  atributos: Atributos
  trilhas: Trilha[]
  pilulas: { l: string; tf?: string; attr?: string[] }[]
  secoes: { n: string; pecas: Peca[] }[]
}
