'use client'

import { Template } from './Template'
import { useFichaPublicaVals, type FichaPublicaDados } from './vals'

export function FichaPublica({ dados }: { dados: FichaPublicaDados }) {
  return <Template v={useFichaPublicaVals(dados)} />
}
