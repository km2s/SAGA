'use client'

import { Template } from './Template'
import { usePainelVals, type PainelDados } from './vals'

export function Painel({ dados, aba }: { dados: PainelDados; aba: string }) {
  return <Template v={usePainelVals(dados, aba)} />
}
