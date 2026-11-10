'use client'

import { Template } from './Template'
import { useExplorarVals, type ExplorarDados } from './vals'

export function Explorar({ dados }: { dados: ExplorarDados }) {
  return <Template v={useExplorarVals(dados)} />
}
