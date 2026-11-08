'use client'

import { Template } from './Template'
import { useEditarSistemaVals, type EditarSistemaDados } from './vals'

export function EditarSistema({ dados }: { dados: EditarSistemaDados }) {
  return <Template v={useEditarSistemaVals(dados)} />
}
