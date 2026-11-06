'use client'

import { Template } from './Template'
import { useInicioVals, type InicioDados } from './vals'

export function Inicio({ dados }: { dados: InicioDados }) {
  return <Template v={useInicioVals(dados)} />
}
