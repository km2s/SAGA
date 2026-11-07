'use client'

import { Template } from './Template'
import { usePerfilVals, type PerfilDados } from './vals'

export function Perfil({ dados }: { dados: PerfilDados }) {
  return <Template v={usePerfilVals(dados)} />
}
