'use client'

import { Importar } from '@/components/screens/importar/Importar'
import { Template } from './Template'
import { usePersonagensVals, type PersonagensDados } from './vals'

/** `?importar=1` ("Importar ficha") abre o modal SAGA Importar Ficha por cima da galeria. */
export function Personagens({ dados, importar, campanhasSemFicha }: { dados: PersonagensDados; importar: boolean; campanhasSemFicha: { id: string; name: string }[] }) {
  return (
    <>
      <Template v={usePersonagensVals(dados)} />
      {importar && <Importar campanhas={campanhasSemFicha} />}
    </>
  )
}
