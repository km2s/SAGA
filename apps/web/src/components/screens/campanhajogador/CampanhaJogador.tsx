'use client'

import { Template } from './Template'
import { useCampanhaJogadorVals, type CampanhaJogadorDados } from './vals'

export function CampanhaJogador({ dados }: { dados: CampanhaJogadorDados }) {
  return <Template v={useCampanhaJogadorVals(dados)} />
}
