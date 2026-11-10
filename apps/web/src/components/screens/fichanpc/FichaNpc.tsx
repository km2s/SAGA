'use client'

import { Template } from './Template'
import { useFichaNpcVals, type FichaNpcDados } from './vals'
import { SPECS } from '@/lib/ficha-sistema/specs'

export function FichaNpc({ dados }: { dados: FichaNpcDados }) {
  return <Template v={useFichaNpcVals(dados, SPECS[dados.sistema]!)} />
}
