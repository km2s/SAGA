import { Convite } from '@/components/screens/convite/Convite'

export default function ConvitePage({ searchParams }: { searchParams: { codigo?: string } }) {
  return <Convite codigo={searchParams.codigo ?? null} />
}
