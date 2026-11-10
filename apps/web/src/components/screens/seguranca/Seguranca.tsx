'use client'

import { Template } from './Template'
import { useSegurancaVals, type SegurancaDados } from './vals'

/** SAGA Segurança: verificação em duas etapas e dispositivos conectados. */
export function Seguranca({ dados }: { dados: SegurancaDados }) {
  return <Template v={useSegurancaVals(dados)} />
}
