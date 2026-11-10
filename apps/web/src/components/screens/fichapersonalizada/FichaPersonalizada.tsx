'use client'

import { Template } from './Template'
import { useFichaPersonalizadaVals, type FichaPersonalizadaDados } from './vals'

/** Ficha de sistema feito por usuário (SAGA Ficha Personalizada); substitui a FichaAntiga. */
export function FichaPersonalizada({ dados }: { dados: FichaPersonalizadaDados }) {
  return <Template v={useFichaPersonalizadaVals(dados)} />
}
