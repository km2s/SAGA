import { signIn } from 'next-auth/react'

/**
 * Chamadas de conta do redesign (SAGA Login). Hoje o NextAuth só tem o
 * Discord; Google, e-mail/senha, cadastro e recuperação entram na fase da API.
 * Contratos em docs/api-pendente.md.
 */

export type AuthResult = { ok: true } | { ok: false; error: string }

// TODO(api): copy de falha genérica não está no design — confirmar.
const FALHA = 'Não foi possível concluir agora. Tente de novo.'

async function erroDe(res: Response): Promise<string> {
  const body = await res.json().catch(() => null) as { error?: string } | null
  return body?.error ?? FALHA
}

// TODO(api): provider Google no NextAuth.
export function signInGoogle(callbackUrl: string) {
  return signIn('google', { callbackUrl })
}

// TODO(api): provider Credentials (e-mail + senha). `remember` decide a duração da sessão.
export async function signInEmail(email: string, password: string, remember: boolean): Promise<AuthResult> {
  const r = await signIn('credentials', { email, password, remember: String(remember), redirect: false })
  if (r?.ok && !r.error) return { ok: true }
  return { ok: false, error: r?.error && r.error !== 'CredentialsSignin' ? r.error : 'E-mail ou senha incorretos.' }
}

// TODO(api): POST /api/auth/cadastro. Depois de criar, já entra com as mesmas credenciais.
export async function signUpEmail(username: string, email: string, password: string): Promise<AuthResult> {
  const res = await fetch('/api/auth/cadastro', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  }).catch(() => null)
  if (!res) return { ok: false, error: FALHA }
  if (!res.ok) return { ok: false, error: await erroDe(res) }
  return signInEmail(email, password, true)
}

// TODO(api): POST /api/auth/recuperar-senha. Responde 200 mesmo se o e-mail não existir.
export async function sendPasswordReset(email: string): Promise<AuthResult> {
  const res = await fetch('/api/auth/recuperar-senha', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  }).catch(() => null)
  if (!res) return { ok: false, error: FALHA }
  return res.ok ? { ok: true } : { ok: false, error: await erroDe(res) }
}

// TODO(api): GET /api/auth/usuario-disponivel?u=. null = não deu para saber (o servidor valida no cadastro).
export async function isUsernameAvailable(user: string, signal?: AbortSignal): Promise<boolean | null> {
  const res = await fetch(`/api/auth/usuario-disponivel?u=${encodeURIComponent(user)}`, { signal }).catch(() => null)
  if (!res?.ok) return null
  const body = await res.json().catch(() => null) as { disponivel?: boolean } | null
  return typeof body?.disponivel === 'boolean' ? body.disponivel : null
}
