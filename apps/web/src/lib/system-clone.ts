import { prisma } from 'database'

/**
 * Atributos mesclados dos sistemas de origem (na ordem pedida), com dedupe por
 * nome — o primeiro sistema a definir "Força" vence. Só sistemas listáveis
 * (presets ou da comunidade) podem servir de origem. Usado para clonar modelos
 * de ficha: sistema novo a partir de presets, importação em sistema existente
 * e template de ficha por NPC (ex.: NPC só de Vampiro V20 numa campanha que
 * mistura V20 + Lobisomem).
 */
export async function mergedAttributesFrom(sourceIds: string[]) {
  const sources = await prisma.rPGSystem.findMany({
    where: {
      id: { in: sourceIds },
      OR: [{ isPreset: true }, { isPreset: false, creatorId: { not: null } }],
    },
    include: { attributes: true },
  }).catch(() => [])
  const byId = new Map(sources.map(s => [s.id, s]))
  const seen = new Set<string>()
  const merged: { id: string; name: string; defaultDie: string; description: string | null }[] = []
  for (const id of sourceIds) {
    const source = byId.get(id)
    if (!source) continue
    for (const a of source.attributes) {
      const key = a.name.trim().toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      merged.push({ id: a.id, name: a.name, defaultDie: a.defaultDie, description: a.description })
    }
  }
  return merged
}

/** Sanitiza a lista de ids de sistemas-modelo vinda do body (máx. 5). */
export function sanitizeSystemIds(ids: unknown): string[] {
  return Array.isArray(ids)
    ? ids.filter((id): id is string => typeof id === 'string' && id.length > 0).slice(0, 5)
    : []
}
