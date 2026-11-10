import { Verificar } from './Verificar'

/** /verificar?t=<bilhete>: o login do Discord manda para cá quando a conta tem verificação em duas etapas. */
export default function VerificarPage({ searchParams }: { searchParams: { t?: string } }) {
  return <Verificar bilhete={searchParams.t ?? ''} />
}
