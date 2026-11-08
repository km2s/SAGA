#!/usr/bin/env node
/**
 * Roda `prisma migrate deploy` no build da Vercel, antes do `next build`.
 *
 * - Só em produção (VERCEL_ENV=production): prévias não mexem no banco.
 * - Se falhar, sai com erro e o build para: a Vercel mantém a versão anterior
 *   no ar, e o código novo nunca sobe sem as colunas de que precisa.
 * - Usa DIRECT_URL (directUrl do schema): migração não passa pelo pooler em
 *   modo transação.
 *
 * Fora da Vercel (ou para rodar à mão): `node packages/database/scripts/migrar-producao.js --forcar`.
 */
const { spawnSync } = require('node:child_process')
const path = require('node:path')

const forcar = process.argv.includes('--forcar')
if (process.env.VERCEL_ENV !== 'production' && !forcar) {
  console.log(`[migrar] pulando: VERCEL_ENV=${process.env.VERCEL_ENV ?? '(vazio)'} (só roda em produção)`)
  process.exit(0)
}
for (const v of ['DATABASE_URL', 'DIRECT_URL']) {
  if (!process.env[v]) {
    console.error(`[migrar] falta a variável ${v}; configure no projeto da Vercel (Settings > Environment Variables).`)
    process.exit(1)
  }
}

/**
 * O endereço direto do Supabase (db.<ref>.supabase.co) só responde por IPv6, e o
 * build da Vercel não tem IPv6 (P1001). Nesse caso a migração usa o Session pooler:
 * o mesmo host do pooler da DATABASE_URL, porta 5432, sem pgbouncer (modo sessão
 * aceita migrações). Mesmas credenciais que a Vercel já tem.
 */
function urlDeMigracao() {
  const direta = process.env.DIRECT_URL
  try {
    const d = new URL(direta), p = new URL(process.env.DATABASE_URL)
    if (/^db\.[a-z0-9]+\.supabase\.co$/.test(d.hostname) && /\.pooler\.supabase\.com$/.test(p.hostname)) {
      const s = new URL(p.toString())
      s.port = '5432'
      s.searchParams.delete('pgbouncer'); s.searchParams.delete('connection_limit')
      console.log(`[migrar] endereço direto do Supabase (só IPv6); usando o Session pooler ${s.hostname}:5432`)
      return s.toString()
    }
  } catch { /* URLs fora do padrão: segue com a DIRECT_URL */ }
  return direta
}

const raiz = path.join(__dirname, '..')
const cli = require.resolve('prisma/build/index.js', { paths: [raiz] })
const schema = path.join(raiz, 'prisma', 'schema.prisma')

console.log('[migrar] prisma migrate deploy')
const r = spawnSync(process.execPath, [cli, 'migrate', 'deploy', `--schema=${schema}`], { cwd: raiz, stdio: 'inherit', env: { ...process.env, DIRECT_URL: urlDeMigracao() } })
if (r.status !== 0) {
  console.error('[migrar] a migração falhou; o build para aqui e a versão anterior continua no ar.')
  process.exit(r.status ?? 1)
}
