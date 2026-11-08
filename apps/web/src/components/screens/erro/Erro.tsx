'use client'

import { Template } from './Template'
import { useErroVals, type ErroDados } from './vals'

export function Erro(props: ErroDados) {
  return <Template v={useErroVals(props)} />
}
