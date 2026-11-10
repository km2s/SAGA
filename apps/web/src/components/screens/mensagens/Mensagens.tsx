'use client'

import { Template } from './Template'
import { useMensagensVals, type MensagensDados } from './vals'

export function Mensagens({ dados }: { dados: MensagensDados }) {
  return <Template v={useMensagensVals(dados)} />
}
