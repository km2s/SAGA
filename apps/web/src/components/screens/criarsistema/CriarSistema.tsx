'use client'

import { Template } from './Template'
import { useCriarSistemaVals, type Fonte } from './vals'

export function CriarSistema({ fontes }: { fontes: Fonte[] }) {
  return <Template v={useCriarSistemaVals(fontes)} />
}
