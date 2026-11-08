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

const raiz = path.join(__dirname, '..')
const cli = require.resolve('prisma/build/index.js', { paths: [raiz] })
const schema = path.join(raiz, 'prisma', 'schema.prisma')

console.log('[migrar] prisma migrate deploy')
const r = spawnSync(process.execPath, [cli, 'migrate', 'deploy', `--schema=${schema}`], { cwd: raiz, stdio: 'inherit', env: process.env })
if (r.status !== 0) {
  console.error('[migrar] a migração falhou; o build para aqui e a versão anterior continua no ar.')
  process.exit(r.status ?? 1)
}
