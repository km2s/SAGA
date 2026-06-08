export interface RollResult {
  expression: string
  rolls: number[]
  modifier: number
  total: number
  isCritical: boolean
  isCriticalFail: boolean
}

export interface AdvantageResult {
  kept: RollResult
  discarded: RollResult
  type: 'advantage' | 'disadvantage'
}

const DIE_REGEX = /^(\d*)d(\d+)([+-]\d+)?$/i

export function roll(input: string): RollResult {
  const match = input.trim().match(DIE_REGEX)
  if (!match) throw new Error(`Expressão de dado inválida: "${input}". Use o formato NdX ou NdX+M (ex: d20, 2d6+3)`)

  const count = parseInt(match[1] || '1')
  const faces = parseInt(match[2])
  const modifier = parseInt(match[3] || '0')

  if (faces < 1) throw new Error('O dado precisa ter ao menos 1 face.')
  if (count < 1 || count > 100) throw new Error('Use entre 1 e 100 dados por vez.')

  const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * faces) + 1)
  const total = rolls.reduce((a, b) => a + b, 0) + modifier

  const isSingleD20 = count === 1 && faces === 20
  return {
    expression: input,
    rolls,
    modifier,
    total,
    isCritical: isSingleD20 && rolls[0] === 20,
    isCriticalFail: isSingleD20 && rolls[0] === 1,
  }
}

export function rollWithAdvantage(dieExpr: string, type: 'advantage' | 'disadvantage'): AdvantageResult {
  const a = roll(dieExpr)
  const b = roll(dieExpr)
  const kept = type === 'advantage'
    ? (a.total >= b.total ? a : b)
    : (a.total <= b.total ? a : b)
  const discarded = kept === a ? b : a
  return { kept, discarded, type }
}

export function buildExpression(die: string, modifier: number): string {
  if (modifier === 0) return die
  return modifier > 0 ? `${die}+${modifier}` : `${die}${modifier}`
}

export function isDieExpression(input: string): boolean {
  return DIE_REGEX.test(input.trim())
}

export function formatRolls(rolls: number[]): string {
  if (rolls.length === 1) return `${rolls[0]}`
  return `[${rolls.join(', ')}]`
}
