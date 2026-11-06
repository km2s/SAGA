'use client'

import { Template } from './Template'
import { useConviteVals } from './vals'

export function Convite({ codigo }: { codigo: string | null }) {
  return <Template v={useConviteVals(codigo)} />
}
