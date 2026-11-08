/* Dados do V20 copiados de components/character/sheets/VtMV20Sheet.tsx (ficha antiga). */

export const CLAN_DISCIPLINES: Record<string, string[]> = {
  // Camarilla
  'Brujah':    ['Celeridade', 'Potência', 'Presença'],
  'Gangrel':   ['Animalismo', 'Fortitude', 'Proteísmo'],
  'Malkavian': ['Auspex', 'Demência', 'Ofuscação'],
  'Nosferatu': ['Animalismo', 'Ofuscação', 'Potência'],
  'Toreador':  ['Auspex', 'Celeridade', 'Presença'],
  'Tremere':   ['Auspex', 'Dominação', 'Taumaturgia'],
  'Ventrue':   ['Dominação', 'Fortitude', 'Presença'],
  // Sabbat
  'Lasombra':  ['Dominação', 'Obtenebridade', 'Potência'],
  'Tzimisce':  ['Animalismo', 'Auspex', 'Vicissitude'],
  // Independentes
  'Assamita':  ['Celeridade', 'Ofuscação', 'Quietus'],
  'Seguidor de Set': ['Ofuscação', 'Presença', 'Serpentis'],
  'Giovanni':  ['Dominação', 'Necromancia', 'Potência'],
  'Ravnos':    ['Animalismo', 'Fortitude', 'Quimerismo'],
  // Camarilla antigos
  'Caitiff':   [],
  'Baali':     ['Demonismo', 'Ofuscação', 'Presença'],
  // Variações comuns de nome
  'Malkaviano':   ['Auspex', 'Demência', 'Ofuscação'],
  'Nosferatu (Clã)': ['Animalismo', 'Ofuscação', 'Potência'],
  'Toreador (Clã)':  ['Auspex', 'Celeridade', 'Presença'],
}

// Todas as disciplinas disponíveis para o seletor manual
export const ALL_DISCIPLINES = [
  'Animalismo', 'Auspex', 'Celeridade', 'Demência', 'Demonismo',
  'Dominação', 'Fortitude', 'Necromancia', 'Obtenebridade', 'Ofuscação',
  'Potência', 'Presença', 'Proteísmo', 'Quimerismo', 'Quietus',
  'Sanguis', 'Serpentis', 'Taumaturgia', 'Vicissitude',
]

// Antecedentes padrão V20
export const DEFAULT_BACKGROUNDS = [
  'Aliados', 'Contatos', 'Domínio', 'Fama', 'Geração', 'Gregge',
  'Influência', 'Mentor', 'Recursos', 'Rebanho', 'Retainers', 'Status',
]

// ── Utilitários ────────────────────────────────────────────────────────────────

function normalizeClan(raw: string): string {
  return raw.trim()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function getDisciplinesForClan(clanRaw: string): string[] {
  for (const [key, discs] of Object.entries(CLAN_DISCIPLINES)) {
    const norm = normalizeClan(key)
    if (normalizeClan(clanRaw).includes(norm) || norm.includes(normalizeClan(clanRaw))) {
      return discs
    }
  }
  return []
}

// [pool de sangue, traço máximo, sangue por turno] por geração (V20 p.269).
export const GEN_TABLE: Record<number, [number, number, number]> = {
  3: [100, 10, 10],
  4: [50, 9, 10], 5: [40, 8, 8], 6: [30, 7, 6],
  7: [20, 6, 4], 8: [15, 5, 3], 9: [14, 5, 2],
  10: [13, 5, 1], 11: [12, 5, 1], 12: [11, 5, 1],
  13: [10, 5, 1], 14: [10, 5, 1], 15: [10, 5, 1],
}
