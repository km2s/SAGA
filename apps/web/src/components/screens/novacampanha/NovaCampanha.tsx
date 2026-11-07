'use client'

import { Template } from './Template'
import { useNovaCampanhaVals, type NovaCampanhaDados } from './vals'

export function NovaCampanha({ dados }: { dados: NovaCampanhaDados }) {
  return <Template v={useNovaCampanhaVals(dados)} />
}
