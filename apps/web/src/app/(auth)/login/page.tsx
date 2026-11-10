import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { LoginView, type LoginMode } from './LoginView'

export default async function LoginPage({ searchParams }: { searchParams: { modo?: string; callbackUrl?: string; error?: string } }) {
  const session = await getServerSession(authOptions)
  if (session) redirect('/dashboard')

  const modo: LoginMode = searchParams.modo === 'cadastro' || searchParams.modo === 'recuperar' ? searchParams.modo : 'login'
  return <LoginView initialMode={modo} callbackUrl={searchParams.callbackUrl} erro={searchParams.error} />
}
