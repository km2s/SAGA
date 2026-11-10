/**
 * Barras de recurso configuráveis por campanha (Pontos de Vida, Pontos de
 * Esforço, Sanidade...). O Mestre define quais barras a campanha usa e cada
 * ficha/NPC guarda os próprios valores.
 *
 * A barra `hp` é especial: lê e grava as colunas hp/maxHp que já existem,
 * porque elas alimentam os tokens e a iniciativa da mesa. As demais ficam em
 * `resourcesJson`. Campanha sem configuração = só Pontos de Vida, como sempre.
 */

export const HP_TRACK_KEY = 'hp'
export const MAX_TRACKS = 6
const KEY_RE = /^[a-z0-9_]{1,24}$/
const MAX_VALUE = 99_999

export type TrackColor = 'vida' | 'esforco' | 'sanidade' | 'mana' | 'sangue' | 'neutro'

export const TRACK_COLORS: Record<TrackColor, { label: string; hex: string }> = {
  vida:     { label: 'Verde (muda com a %)', hex: '#16a34a' },
  esforco:  { label: 'Âmbar',                hex: '#d97706' },
  sanidade: { label: 'Roxo',                 hex: '#7c3aed' },
  mana:     { label: 'Azul',                 hex: '#2563eb' },
  sangue:   { label: 'Vermelho',             hex: '#b91c1c' },
  neutro:   { label: 'Cinza',                hex: '#64748b' },
}

export interface ResourceTrack { key: string; label: string; color: TrackColor }
export interface ResourceValue { current: number; max: number }
export type ResourceValues = Record<string, ResourceValue>

export const DEFAULT_TRACKS: ResourceTrack[] = [
  { key: HP_TRACK_KEY, label: 'Pontos de Vida', color: 'vida' },
]

export const TRACK_PRESETS: ResourceTrack[] = [
  { key: HP_TRACK_KEY, label: 'Pontos de Vida',    color: 'vida' },
  { key: 'pe',         label: 'Pontos de Esforço', color: 'esforco' },
  { key: 'san',        label: 'Sanidade',          color: 'sanidade' },
  { key: 'pm',         label: 'Pontos de Mana',    color: 'mana' },
]

function isTrackColor(v: unknown): v is TrackColor {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(TRACK_COLORS, v)
}

/** Valida a lista de barras vinda do body ou do banco. `null` = inválida. */
export function sanitizeTracks(input: unknown): ResourceTrack[] | null {
  if (!Array.isArray(input) || input.length > MAX_TRACKS) return null
  const seen = new Set<string>()
  const out: ResourceTrack[] = []
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') return null
    const { key, label, color } = raw as Record<string, unknown>
    if (typeof key !== 'string' || !KEY_RE.test(key) || seen.has(key)) return null
    if (typeof label !== 'string' || !label.trim()) return null
    seen.add(key)
    out.push({ key, label: label.trim().slice(0, 30), color: isTrackColor(color) ? color : 'neutro' })
  }
  return out
}

/** Barras da campanha; sem configuração válida = só Pontos de Vida. */
export function parseTracks(json: string | null | undefined): ResourceTrack[] {
  if (!json) return DEFAULT_TRACKS
  try {
    return sanitizeTracks(JSON.parse(json)) ?? DEFAULT_TRACKS
  } catch {
    return DEFAULT_TRACKS
  }
}

function toInt(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  return Math.min(MAX_VALUE, Math.max(0, Math.round(v)))
}

/**
 * Valores `{chave: {current, max}}` das barras que não são `hp`. Entradas
 * malformadas são ignoradas e o atual nunca passa do máximo.
 */
export function sanitizeResources(input: unknown): ResourceValues {
  const out: ResourceValues = {}
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out
  for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
    if (!KEY_RE.test(key) || key === HP_TRACK_KEY || !raw || typeof raw !== 'object') continue
    const current = toInt((raw as Record<string, unknown>).current)
    const max = toInt((raw as Record<string, unknown>).max)
    if (current === null || max === null) continue
    out[key] = { current: Math.min(current, max), max }
  }
  return out
}

export function parseResources(json: string | null | undefined): ResourceValues {
  if (!json) return {}
  try {
    return sanitizeResources(JSON.parse(json))
  } catch {
    return {}
  }
}

/** Mescla uma atualização parcial de valores com os já gravados. */
export function mergeResourcesJson(existingJson: string | null | undefined, patch: unknown): string {
  return JSON.stringify({ ...parseResources(existingJson), ...sanitizeResources(patch) })
}

/** Valor de uma barra: `hp` vem das colunas; as demais do JSON (0/0 se nunca definida). */
export function trackValue(track: ResourceTrack, hp: number, maxHp: number, resources: ResourceValues): ResourceValue {
  if (track.key === HP_TRACK_KEY) return { current: hp, max: maxHp }
  return resources[track.key] ?? { current: 0, max: 0 }
}

export function hasHpTrack(tracks: ResourceTrack[]): boolean {
  return tracks.some(t => t.key === HP_TRACK_KEY)
}

/** Cor da barra: a verde de vida muda com a porcentagem; as demais são fixas. */
export function trackBarColor(track: ResourceTrack, pct: number): string {
  if (track.color === 'vida') return pct > 60 ? '#16a34a' : pct > 30 ? '#d97706' : '#dc2626'
  return TRACK_COLORS[track.color].hex
}

/** Chave estável para uma barra personalizada, derivada do nome. */
export function trackKeyFromLabel(label: string, taken: Set<string>): string {
  const base = label
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20) || 'barra'
  let key = base
  let i = 2
  while (taken.has(key)) key = `${base.slice(0, 18)}_${i++}`
  return key
}
