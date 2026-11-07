'use client'

import { Template } from './Template'
import { useSistemasVals, type SistemasDados } from './vals'

export function Sistemas({ dados }: { dados: SistemasDados }) {
  return <Template v={useSistemasVals(dados)} />
}
