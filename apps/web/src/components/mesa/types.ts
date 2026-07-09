export type Tool = 'select' | 'move' | 'token' | 'marker' | 'measure' | 'fog' | 'reveal'

export interface Token {
  id: string; label: string; initial: string
  x: number; y: number
  type: 'player' | 'enemy' | 'npc'; color: string
  hp?: number; maxHp?: number
  imageUrl?: string | null
  allowedPlayers?: string[]
}

export interface InitiativeEntry {
  tokenId: string; label: string; color: string; type: string
  initiative: number; hp?: number; maxHp?: number
}
export interface Marker { id: string; x: number; y: number; color: string; createdAt: number }
export interface RollLogEntry {
  id: string; expression: string; rolls: number[]; modifier: number
  total: number; attribute: string | null; rolledBy: string; rolledAt: string
}
export interface CharAttr { id: string; value: number; name: string; defaultDie: string }
export interface CharData {
  id: string; name: string; race: string | null; class: string | null
  level: number; hp: number; maxHp: number; imageUrl: string | null; attributes: CharAttr[]
}
export interface Member { id: string; role: string; user: { username: string }; character: CharData | null }
export interface NpcData { id: string; name: string; type: string; race: string | null; class: string | null; level: number; hp: number; maxHp: number; imageUrl: string | null; attributes: CharAttr[] }
export interface Campaign { id: string; name: string }
export interface AddTokenState { screenX: number; screenY: number; worldX: number; worldY: number }
export interface SessionState { tokensJson: string | null; musicYoutubeId: string | null; musicVolume: number; mapImageUrl: string | null; liveMembersJson: string | null; markersJson?: string | null }
export interface ActiveSession { id: string; name: string | null; isActive: boolean; tokensJson?: string | null; musicYoutubeId?: string | null; musicVolume?: number; mapImageUrl?: string | null; liveMembersJson?: string | null }

export const GRID = 40
export const PLAYER_COLORS = ['#7c3aed','#8f3a24','#c9a22a','#059669','#d97706','#db2777','#9333ea']
export const TOKEN_COLORS  = ['#7c3aed','#ef4444','#22c55e','#f59e0b','#d9662b','#ec4899','#c9a22a']
export const DICE = ['d4','d6','d8','d10','d12','d20','d100']

export function snap(v: number) { return Math.round(v / GRID) * GRID }

export function initTokens(members: Member[]): Token[] {
  return members
    .filter(m => m.role !== 'GM')
    .map((m, i) => ({
      id: m.id,
      label: m.character?.name ?? m.user.username,
      initial: (m.character?.name ?? m.user.username)[0]?.toUpperCase() ?? '?',
      x: ((i % 8) + 1) * GRID, y: (Math.floor(i / 8) + 1) * GRID,
      type: 'player' as const,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length] ?? '#7c3aed',
      hp: m.character?.hp,
      maxHp: m.character?.maxHp,
      imageUrl: m.character?.imageUrl ?? null,
    }))
}

export function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'agora'
  const m = Math.floor(s / 60)
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h`
}
