'use client'

import { Template } from './Template'
import { useCriarPersonagemVals, type CriarPersonagemDados } from './vals'

export function CriarPersonagem({ dados }: { dados: CriarPersonagemDados }) {
  return <Template v={useCriarPersonagemVals(dados)} />
}
