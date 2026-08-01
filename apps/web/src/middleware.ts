import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

const PROTECTED = ['/dashboard', '/campaign']

// Deve casar exatamente com a config de cookies em src/lib/auth.ts, senão o
// getToken procura um nome de cookie diferente e nunca encontra a sessão.
const USE_SECURE_COOKIES = process.env.NODE_ENV === 'production'
const SESSION_COOKIE_NAME = `${USE_SECURE_COOKIES ? '__Secure-' : ''}next-auth.session-token`

// Em desenvolvimento o webpack do Next usa `eval` para os source maps. Sem
// 'unsafe-eval' o bundle principal morre com EvalError logo no início, a
// hidratação nunca acontece e NADA na página fica clicável. Produção continua
// estrita — o build de produção não usa eval.
const DEV_EVAL = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    // strict-dynamic permite que scripts com nonce carreguem outros scripts (ex: chunks Next.js)
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${DEV_EVAL}`,
    // Google Fonts (Cinzel, Cormorant, etc.) são carregadas via @import em globals.css:
    // a folha vem de fonts.googleapis.com e os arquivos .woff2 de fonts.gstatic.com.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Imagens de usuário (mapas, retratos, handouts) podem vir de qualquer host
    // público (reddit, imgur, etc.). Liberar https: é seguro: imagens não
    // executam script e o servidor não busca essas URLs. A validação de host
    // interno/privado fica em lib/validate-url.ts.
    "img-src 'self' https: data: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self'",
    "media-src 'self' https://www.youtube-nocookie.com",
    "frame-src https://www.youtube-nocookie.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ')
}

export async function middleware(req: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp   = buildCsp(nonce)

  const { pathname } = req.nextUrl
  const isProtected = PROTECTED.some(p => pathname.startsWith(p))

  if (isProtected) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: SESSION_COOKIE_NAME,
      secureCookie: USE_SECURE_COOKIES,
    })
    if (!token) {
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('callbackUrl', req.url)
      const res = NextResponse.redirect(url)
      res.headers.set('content-security-policy', csp)
      return res
    }
  }

  // Passa o nonce para o Next.js via request header (lido pelo layout.tsx e pelo próprio Next.js)
  const reqHeaders = new Headers(req.headers)
  reqHeaders.set('x-nonce', nonce)

  const res = NextResponse.next({ request: { headers: reqHeaders } })
  res.headers.set('content-security-policy', csp)
  return res
}

export const config = {
  // Exclui arquivos estáticos e rotas de API (não servem HTML, não precisam de CSP)
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|api/).*)',],
}
