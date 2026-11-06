import { Convite } from '@/components/screens/convite/Convite'

/** Link direto de convite (/convite/KRAK3D7M): a busca começa sozinha. */
export default function ConviteCodigoPage({ params }: { params: { codigo: string } }) {
  return <Convite codigo={decodeURIComponent(params.codigo)} />
}
