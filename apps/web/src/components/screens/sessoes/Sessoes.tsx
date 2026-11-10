'use client'

import { Template } from './Template'
import { useSessoesVals, type SessoesDados } from './vals'

export function Sessoes({ dados }: { dados: SessoesDados }) {
  return <Template v={useSessoesVals(dados)} />
}
