import NextAuth from 'next-auth'
import { NextRequest } from 'next/server'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)

/**
 * O Discord passou a mandar `iss` (RFC 9207) na volta do OAuth. O openid-client
 * do NextAuth v4 só aceita esse parâmetro se o provedor tiver `issuer`
 * configurado e falha com "issuer must be configured on the issuer". Com um só
 * provedor não há o ataque de mistura que o `iss` previne, e o `state` segue
 * conferido; então tiramos o parâmetro antes de o NextAuth ler a URL.
 */
function semIss(req: NextRequest): NextRequest {
  const url = new URL(req.url)
  if (!url.pathname.endsWith('/callback/discord') || !url.searchParams.has('iss')) return req
  url.searchParams.delete('iss')
  return new NextRequest(url, req)
}

type Ctx = { params: { nextauth: string[] } }
export function GET(req: NextRequest, ctx: Ctx) { return handler(semIss(req), ctx) }
export function POST(req: NextRequest, ctx: Ctx) { return handler(req, ctx) }
