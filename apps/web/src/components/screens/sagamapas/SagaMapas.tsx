'use client'

import { Template } from './Template'
import { useSagaMapasVals, type SagaMapasProps } from './vals'

/** Uma implementação, dois lugares: painel lateral da Mesa e aba Mapas do Painel do Mestre. */
export function SagaMapas(props: SagaMapasProps) {
  return <Template v={useSagaMapasVals(props)} />
}
