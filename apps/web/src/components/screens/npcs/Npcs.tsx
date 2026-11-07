'use client'

import { Template } from './Template'
import { useNpcsVals, type NpcsDados } from './vals'

export function Npcs({ dados }: { dados: NpcsDados }) {
  return <Template v={useNpcsVals(dados)} />
}
