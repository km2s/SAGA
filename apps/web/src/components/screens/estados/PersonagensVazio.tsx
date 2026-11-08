'use client'

import { Template } from './Template'
import { useEstadosVals } from './vals'

/** /personagens sem nenhum personagem (SAGA Estados › Personagens vazio). */
export function PersonagensVazio() {
  return <Template v={useEstadosVals()} />
}
