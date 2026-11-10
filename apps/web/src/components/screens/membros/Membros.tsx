'use client'

import { Template } from './Template'
import { useMembrosVals, type MembrosDados } from './vals'

export function Membros({ dados }: { dados: MembrosDados }) {
  return <Template v={useMembrosVals(dados)} />
}
