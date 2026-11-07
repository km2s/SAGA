'use client'

import { Template } from './Template'
import { useCriarSistemaVals } from './vals'

export function CriarSistema() {
  return <Template v={useCriarSistemaVals()} />
}
