'use client'

import { Template } from './Template'
import { useSessaoVals, type SessaoDados } from './vals'

export function Sessao({ dados }: { dados: SessaoDados }) {
  return <Template v={useSessaoVals(dados)} />
}
