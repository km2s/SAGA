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

const RAW_VALUE_CATEGORIES = new Set<SheetCategory>(['custom', 'generic'])

/**
 * Modificador de um atributo conforme a convenção do sistema.
 * D&D-family (d20 ability scores): (valor-10)/2. Genérico/personalizado: o
 * próprio valor é o bônus (5 = +5).
 */
export function attributeModifier(value: number, category: SheetCategory): number {
  return RAW_VALUE_CATEGORIES.has(category) ? value : Math.floor((value - 10) / 2)
}

export function formatModifier(value: number, category: SheetCategory): string {
  const m = attributeModifier(value, category)
  return m >= 0 ? `+${m}` : `${m}`
}
