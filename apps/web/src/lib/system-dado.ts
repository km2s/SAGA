/**
 * Dado base dos sistemas pré-definidos (lib/systems-seed.ts), pela regra de
 * cada jogo. TODO(api): RPGSystem.baseDie, para valer também nos homebrews.
 */
const DADO: Record<string, string> = {
  'D&D 5e': 'd20', 'D&D 3.5e': 'd20', 'Pathfinder 2e': 'd20', 'Pathfinder 1e': 'd20', 'Tormenta20': 'd20',
  'Old Dragon 2': 'd20', '13th Age': 'd20', 'Starfinder': 'd20', 'Dungeon World': '2d6',
  'Vampire: The Masquerade V5': 'd10', 'Vampire: The Masquerade V20': 'd10', 'Werewolf: The Apocalypse': 'd10',
  'Mage: The Ascension': 'd10', 'Mage: The Awakening': 'd10', 'Hunter: The Reckoning': 'd10', 'Changeling: The Lost': 'd10',
  'Demon: The Descent': 'd10', 'Geist: The Sin-Eaters': 'd10', 'Cyberpunk Red': 'd10',
  'Call of Cthulhu 7e': 'd100', 'Delta Green': 'd100', 'Mothership': 'd100',
  'Shadowrun 6e': 'd6', 'Blades in the Dark': 'd6', 'Savage Worlds': 'd4–d12', 'Ironsworn': 'd6 + 2d10',
  'GURPS 4e': '3d6', 'Fate Core': '4dF', 'Star Wars: Edge of the Empire': 'dados narrativos',
}
export const dadoBase = (nome: string): string => DADO[nome] ?? '—'
