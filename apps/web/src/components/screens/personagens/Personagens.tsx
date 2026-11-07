'use client'

import { useRouter } from 'next/navigation'
import { ImportCharacterModal } from '@/components/character/ImportCharacterModal'
import { Template } from './Template'
import { usePersonagensVals, type PersonagensDados } from './vals'

/**
 * `?importar=1` ("Importar ficha") abre o modal de importação atual até a
 * tela SAGA Importar Ficha ser implementada.
 */
export function Personagens({ dados, importar, campanhasSemFicha }: { dados: PersonagensDados; importar: boolean; campanhasSemFicha: { id: string; name: string }[] }) {
  const router = useRouter()
  return (
    <>
      <Template v={usePersonagensVals(dados)} />
      <ImportCharacterModal open={importar} onClose={() => router.replace('/personagens')} campaigns={campanhasSemFicha} />
    </>
  )
}
