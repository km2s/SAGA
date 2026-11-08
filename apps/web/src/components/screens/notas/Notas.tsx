'use client'

import { Template } from './Template'
import { useNotasVals, type NotasDados } from './vals'

export function Notas({ dados }: { dados: NotasDados }) {
  return <Template v={useNotasVals(dados)} />
}
