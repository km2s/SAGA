/**
 * Spec de cada sistema na Ficha por Sistema. Todos os campos apontam para os
 * dados que as fichas antigas (components/character/sheets/*) já gravavam.
 */

/** Seleciona atributos da ficha: pelo prefixo da descrição do seed ("Habilidade Social —") ou pelo nome. */
export type Sel = { prefixo?: string[]; nomes?: string[]; /** começo do nome ("Insight —" no Blades) */ nomePrefixo?: string[]; /** todos os atributos (Fate: as perícias são os atributos) */ todos?: boolean }
export type Regra = 'v5' | 'wod' | 'cod' | 'd20' | 'pf2' | 'coc' | 'pct' | 'ms' | 'dw' | 'isw' | 'fate' | 'bitd' | 'sr' | 'cpr' | 'sw' | 'savage' | 'gurps'
export type Familia = 'dots' | 'd20' | 'pct' | 'pbta' | 'narr' | 'pool' | 'step'

/** Atributos principais (bloco do topo da moldura). */
export type Atributos =
  | { tipo: 'bolinhas'; grupos: { l: string; sel: Sel }[]; max?: Bolinhas }
  | { tipo: 'tiles'; sel: Sel; mostra: 'mod' | 'valor' | 'pct' | 'dado' | 'sinal' | 'x5' }

/** Quantidade que uma trilha mostra/grava. */
export type Fonte =
  | { attr: string[] }                          // valor de um atributo (o primeiro nome que existir)
  | { tf: string; label: string; gasto?: true }  // número num campo de texto (gasto = marca o que foi usado)
  | { pv: true }                                 // vida da ficha (hp/maxHp)
/** soma: atributos somados (cada um pelo primeiro nome que existir) + `mais` (ex.: Vitalidade V5 = Vigor + 3). */
export type Maximo = number | { attr: string[] } | { tf: string } | { soma: string[][]; mais?: number } | { pv: true } | ((c: Ctx) => number)
export type Trilha =
  | { n: string; forma: 'dot' | 'box'; fonte: Fonte; max: Maximo; d?: string; sangue?: boolean }
  | { n: string; forma: 'bar' | 'num'; fonte: Fonte; max: Maximo; d?: string }
  | { n: string; forma: 'momentum'; fonte: Fonte; d?: string } // −6 a +10 (Ironsworn)
  | { n: string; forma: 'marcadas'; tf: string; label: string; max: Maximo; d?: string } // "1,0,0": caixas marcadas (estresse do Fate)
  | { n: string; forma: 'estados'; tf: string; label: string; max: Maximo; d?: string } // CSV 0/1/2 (vazia, superficial, agravado)
  | { n: string; forma: 'niveis'; tf: string; label: string; niveis: [nome: string, penalidade: string][]; d?: string } // "0110000": um 0/1 por nível (V20, Demônio, Geist)

/** Contexto para regras que dependem da ficha (ex.: máximo de bolinhas pela geração no V20). */
export type Ctx = { attr: (nomes: string[]) => number | undefined; tf: Record<string, string> }
export type Bolinhas = number | ((c: Ctx) => number)

export type Peca =
  /** Lista de bolinhas guardada em textos (V20): uma chave por nome; base vem da ficha, extras numa lista "a|b|c". */
  | { tipo: 'listaTf'; l: string; chave: (nome: string) => string; rotulo: (nome: string) => string; base: (c: Ctx) => string[]; extras: { key: string; label: string }; novo: string; bolinhas: Bolinhas }
  | { tipo: 'texto'; campos: [key: string, label: string, longo?: boolean][] }
  | { tipo: 'linhas'; l?: string; grupos: { l?: string; sel: Sel }[]; bolinhas?: Bolinhas; /** Seletor de proficiência no valor do atributo (PF2: D/T/E/M/L); rola d20 + nível + 2×rank. */ prof?: string[]; adicionar?: { label: string; descricao: string; dado: string }; min?: string }
  | { tipo: 'armas' }
  /** Espaços de magia por círculo (CharacterSpellSlot): marca os gastos. */
  | { tipo: 'espacos' }
  /** Marcas liga/desliga, cada uma num texto "1"/"0" (condições do Ironsworn). */
  | { tipo: 'marcas'; l: string; itens: [key: string, label: string][] }
  /** Linhas nome + valor, ambos em textos (vínculos do Delta Green). */
  | { tipo: 'pares'; l: string; itens: { nome: [key: string, label: string]; valor: [key: string, label: string] }[]; max: number }
  /** Jura do Ironsworn: vow{i}_title, vow{i}_rank, vow{i}_progress (ticks, até 40). */
  | { tipo: 'jura'; i: number }
  | { tipo: 'chips'; l: string; tf: string; label: string; opcoes: string[] }
  | { tipo: 'trilhas'; trilhas: Trilha[] }

export type SistemaSpec = {
  familia: Familia; regra: Regra
  /** Linha abaixo do nome: chaves de texto, na ordem ("Toreador · 13ª geração"). */
  linha: string[]
  atributos: Atributos
  trilhas: Trilha[]
  /** Pílulas do cabeçalho: um valor (texto/atributo) ou todos os atributos de um grupo (`sel`). */
  pilulas: { l?: string; tf?: string; attr?: string[]; sel?: Sel }[]
  /** A vida fica em textos da ficha (hp_current/hp_max), não na barra de PV da campanha. */
  semPvFicha?: boolean
  /** Nome da aba com os atributos que nenhum grupo cobre (padrão "Outros"; ex.: "Perícias"). */
  outrosNome?: string
  secoes: { n: string; pecas: Peca[] }[]
}
