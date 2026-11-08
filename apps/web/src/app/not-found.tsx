import { Erro } from '@/components/screens/erro/Erro'

export const metadata = { title: 'Página não encontrada · SAGA' }

export default function NotFound() {
  return <Erro tipo="404" />
}
