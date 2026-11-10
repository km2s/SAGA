import { redirect } from 'next/navigation'

// O /gm antigo foi absorvido pelo Painel do Mestre (raiz da campanha).
export default function GmPage({ params }: { params: { id: string } }) {
  redirect(`/campaign/${params.id}`)
}
