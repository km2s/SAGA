'use client'

import { Template } from './Template'
import { useTourVals, type TourDados } from './vals'

/** Primeiros Passos: apresentação do Corvin + widget dos 6 ritos, por cima de qualquer tela do app. */
export function Tour({ dados }: { dados: TourDados }) {
  return (
    <div data-s="">
      <Template v={useTourVals(dados)} />
    </div>
  )
}
