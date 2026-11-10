import type { SheetCategory } from '@/components/character/CharacterSheetView'

export type { SheetCategory }

const SYSTEM_CATEGORIES: Record<string, SheetCategory> = {
  'D&D 5e': 'fantasy', 'D&D 3.5e': 'fantasy', 'Pathfinder 2e': 'fantasy',
  'Pathfinder 1e': 'fantasy', 'Tormenta20': 'fantasy', 'Old Dragon 2': 'fantasy',
  'Dungeon World': 'fantasy', '13th Age': 'fantasy',
  'Vampire: The Masquerade V5': 'world-of-darkness',
  'Vampire: The Masquerade V20': 'world-of-darkness',
  'Vampire: The Masquerade': 'world-of-darkness',
  'Werewolf: The Apocalypse': 'world-of-darkness',
  'Mage: The Ascension': 'world-of-darkness',
  'Mage: The Awakening': 'world-of-darkness',
  'Hunter: The Reckoning': 'world-of-darkness',
  'Changeling: The Lost': 'world-of-darkness',
  'Demon: The Descent': 'world-of-darkness',
  'Geist: The Sin-Eaters': 'world-of-darkness',
  'Call of Cthulhu 7e': 'horror', 'Delta Green': 'horror', 'Mothership': 'horror',
  'Cyberpunk Red': 'scifi', 'Starfinder': 'scifi', 'Shadowrun 6e': 'scifi',
  'Star Wars: Edge of the Empire': 'scifi',
  'GURPS 4e': 'generic', 'Fate Core': 'generic', 'Savage Worlds': 'generic',
  'Blades in the Dark': 'generic', 'Ironsworn': 'generic',
  'Personalizado': 'custom',
}

const VALID: SheetCategory[] = ['fantasy', 'world-of-darkness', 'horror', 'scifi', 'generic', 'custom']

/** Detecta a categoria da ficha a partir do NOME do sistema (presets). */
export function detectCategory(name: string | null | undefined): SheetCategory {
  if (!name) return 'custom'
  const exact = SYSTEM_CATEGORIES[name]
  if (exact) return exact
  const n = name.toLowerCase()
  if (n.includes('vampire') || n.includes('werewolf') || n.includes('mage') ||
      n.includes('hunter') || n.includes('changeling') || n.includes('demon') ||
      n.includes('geist') || n.includes('masquerade') || n.includes('darkness'))
    return 'world-of-darkness'
  if (n.includes('cthulhu') || n.includes('horror') || n.includes('mothership') || n.includes('delta green'))
    return 'horror'
  if (n.includes('cyberpunk') || n.includes('starfinder') || n.includes('shadowrun') || n.includes('star wars'))
    return 'scifi'
  if (n.includes('d&d') || n.includes('pathfinder') || n.includes('tormenta') || n.includes('dungeon'))
    return 'fantasy'
  return 'custom'
}

/**
 * Categoria efetiva da ficha. Sistemas personalizados (não-preset) respeitam a
 * categoria escolhida pelo usuário; presets seguem a detecção por nome. Evita
 * que um sistema custom caia em "fantasy" e aplique o modificador (valor-10)/2.
 */
export function resolveSheetCategory(
  system: { name?: string | null; category?: string | null; isPreset?: boolean } | null | undefined,
): SheetCategory {
  if (system && system.isPreset === false && system.category && (VALID as string[]).includes(system.category)) {
    return system.category as SheetCategory
  }
  return detectCategory(system?.name)
}

// Só a família d20 converte ability score em modificador; os demais usam o
// valor cru. World of Darkness é dice pool (pontos = dados a rolar) e horror
// (Call of Cthulhu) é percentil (o valor é a porcentagem) — aplicar
// (valor-10)/2 fora do d20 não significa nada (ex.: CAR 1 virava "-5").
const D20_CATEGORIES = new Set<SheetCategory>(['fantasy'])

/** A categoria usa a convenção de ability scores do d20 ((valor-10)/2)? */
export function isD20Category(category: SheetCategory): boolean {
  return D20_CATEGORIES.has(category)
}

/**
 * Modificador de um atributo conforme a convenção do sistema.
 * Família d20 (fantasy): (valor-10)/2. Todo o resto: o próprio valor.
 */
export function attributeModifier(value: number, category: SheetCategory): number {
  return D20_CATEGORIES.has(category) ? Math.floor((value - 10) / 2) : value
}

export function formatModifier(value: number, category: SheetCategory): string {
  const m = attributeModifier(value, category)
  return m >= 0 ? `+${m}` : `${m}`
}

/**
 * Dado sugerido para novos atributos conforme a família mecânica do sistema:
 * Mundo das Trevas (Storyteller) rola pools de d10, horror (CoC/Delta Green/
 * Mothership) é percentil (d100); as demais famílias sugerem d20.
 */
export function defaultDieForCategory(category: string | null | undefined): string {
  if (category === 'world-of-darkness') return 'd10'
  if (category === 'horror') return 'd100'
  return 'd20'
}

/**
 * Pool de dados de um atributo não-d20: o valor é a quantidade de dados
 * (ex.: VtM Força 3 → 3d10, com defaultDie d10 dos seeds). Sem contagem de
 * sucessos/dificuldade/botch — isso é a futura rolagem consciente do sistema.
 * Limites acompanham a API de rolagem (mín. 1 dado, máx. 100); defaultDie
 * fora do formato dN cai em d10 (família WoD, principal consumidora de pools).
 */
export function attributePool(value: number, defaultDie: string): { count: number; die: string } {
  const count = Math.min(100, Math.max(1, Math.round(value)))
  const die = /^d\d+$/.test(defaultDie) ? defaultDie : 'd10'
  return { count, die }
}
