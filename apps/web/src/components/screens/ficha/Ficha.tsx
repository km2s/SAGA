'use client'

import { Template } from './Template'
import { useFichaVals, type FichaDados } from './vals'

export function Ficha({ dados }: { dados: FichaDados }) {
  return <Template v={useFichaVals(dados)} />
}
