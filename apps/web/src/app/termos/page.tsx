import type { Metadata } from 'next'
import { LegalView } from '@/components/legal/LegalView'

export const metadata: Metadata = { title: 'Termos de Uso — SAGA' }

export default function TermosPage() {
  return <LegalView doc="termos" />
}
