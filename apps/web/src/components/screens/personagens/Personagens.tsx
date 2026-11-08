'use client'

import { Importar } from '@/components/screens/importar/Importar'
import { Template } from './Template'
import { usePersonagensVals, type PersonagensDados } from './vals'
import { PersonagensVazio } from '@/components/screens/estados/PersonagensVazio'

function Galeria({ dados }: { dados: PersonagensDados }) {
  return <Template v={usePersonagensVals(dados)} />
}

/** `?importar=1` ("Importar ficha") abre o modal SAGA Importar Ficha por cima da galeria. */
export function Personagens({ dados, importar, campanhasSemFicha }: { dados: PersonagensDados; importar: boolean; campanhasSemFicha: { id: string; name: string }[] }) {
  // Nenhum personagem nem NPC: o estado vazio do design (sem o painel lateral).
  const vazio = dados.chars.length === 0 && dados.grupos.every(g => g.npcs.length === 0)
  return (
    <>
      {vazio ? <PersonagensVazio /> : <Galeria dados={dados} />}
      {importar && <Importar campanhas={campanhasSemFicha} />}
    </>
  )
}
