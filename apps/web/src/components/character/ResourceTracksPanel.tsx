'use client'

import { useRouter } from 'next/navigation'
import { ResourceTrackCard } from './ResourceTrackCard'
import {
  HP_TRACK_KEY, trackValue,
  type ResourceTrack, type ResourceValue, type ResourceValues,
} from '@/lib/resource-tracks'

/**
 * Barras de recurso configuradas na campanha para uma ficha ou NPC. A barra de
 * vida grava em hp/maxHp; as demais em `resources`. `endpoint` é a rota PATCH
 * da ficha (`/api/characters/:id`) ou do NPC; `null` deixa tudo só leitura.
 */
export function ResourceTracksPanel({ tracks, hp, maxHp, resources, canEdit, endpoint }: {
  tracks: ResourceTrack[]
  hp: number
  maxHp: number
  resources: ResourceValues
  canEdit: boolean
  endpoint: string | null
}) {
  const router = useRouter()

  async function save(track: ResourceTrack, next: ResourceValue) {
    if (!endpoint) return
    const body = track.key === HP_TRACK_KEY
      ? { hp: next.current, maxHp: next.max }
      : { resources: { [track.key]: next } }
    await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null)
    router.refresh()
  }

  if (tracks.length === 0) return null

  return (
    <div className="space-y-4">
      {tracks.map(track => (
        <ResourceTrackCard
          key={track.key}
          track={track}
          value={trackValue(track, hp, maxHp, resources)}
          canEdit={canEdit && !!endpoint}
          onSave={endpoint ? next => save(track, next) : undefined}
        />
      ))}
    </div>
  )
}
