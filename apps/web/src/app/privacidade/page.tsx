import type { Metadata } from 'next'
import { LegalView } from '@/components/legal/LegalView'

export const metadata: Metadata = { title: 'Política de Privacidade — SAGA' }

export default function PrivacidadePage() {
  return <LegalView doc="privacidade" />
}
