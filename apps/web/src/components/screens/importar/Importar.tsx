'use client'

import { Template } from './Template'
import { useImportarVals } from './vals'

/** Modal "Importar ficha" por cima de /personagens (?importar=1). */
export function Importar({ campanhas }: { campanhas: { id: string; name: string }[] }) {
  return <Template v={useImportarVals(campanhas)} />
}
