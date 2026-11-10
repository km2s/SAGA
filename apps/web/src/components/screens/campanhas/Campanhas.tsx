'use client'

import { Template } from './Template'
import { useCampanhasVals, type CampanhasDados } from './vals'

export function Campanhas({ dados }: { dados: CampanhasDados }) {
  return <Template v={useCampanhasVals(dados)} />
}
