#!/usr/bin/env node
/**
 * Verifica se as variáveis de ambiente do banco estão corretas
 * e se a conexão com o Supabase funciona.
 *
 * Uso: node scripts/check-db.mjs [caminho-do-env]
 * Exemplos:
 *   node scripts/check-db.mjs
 *   node scripts/check-db.mjs apps/web/.env
 */

import { readFileSync } from 'fs'
import { createConnection } from 'net'
import path from 'path'

const envFile = process.argv[2] ?? 'apps/web/.env'

// Carrega o .env manualmente
let envContent = ''
try {
  envContent = readFileSync(envFile, 'utf8')
} catch {
  console.error(`❌ Arquivo não encontrado: ${envFile}`)
  process.exit(1)
}

const env = {}
for (const line of envContent.split('\n')) {
  const match = line.match(/^([A-Z_]+)="?(.+?)"?$/)
  if (match) env[match[1]] = match[2]
}

const DATABASE_URL = env['DATABASE_URL']
const DIRECT_URL   = env['DIRECT_URL']

console.log('\n═══════════════════════════════════════════')
console.log(`  Verificando: ${envFile}`)
console.log('═══════════════════════════════════════════\n')

function parseUrl(name, raw) {
  if (!raw) {
    console.log(`❌ ${name} não definida`)
    return null
  }

  let u
  try {
    u = new URL(raw)
  } catch {
    console.log(`❌ ${name} — URL inválida (não parseou)`)
    return null
  }

  const password = u.password
  const decoded  = decodeURIComponent(password)
  const needsEncode = encodeURIComponent(decoded) !== password

  const isPooler = u.hostname.includes('pooler.supabase.com')
  const isDirect = u.hostname.includes('.supabase.co') && !u.hostname.includes('pooler')
  const hasPgbouncer = u.searchParams.get('pgbouncer') === 'true'
  const hasConnLimit = u.searchParams.has('connection_limit')

  console.log(`${name}:`)
  console.log(`  host   : ${u.hostname}`)
  console.log(`  porta  : ${u.port}`)
  console.log(`  usuário: ${u.username}`)
  console.log(`  senha  : ${'*'.repeat(Math.min(password.length, 6))}... (${password.length} chars)`)
  console.log(`  senha URL-encoded: ${needsEncode ? '❌ NÃO — pode quebrar no Vercel!' : '✅ sim'}`)

  if (name === 'DATABASE_URL') {
    console.log(`  via pooler      : ${isPooler ? '✅' : '❌ DEVE apontar para pooler.supabase.com'}`)
    console.log(`  pgbouncer=true  : ${hasPgbouncer ? '✅' : '❌ faltando ?pgbouncer=true'}`)
    console.log(`  connection_limit: ${hasConnLimit ? '✅' : '⚠️  recomendado connection_limit=1'}`)
    if (u.port !== '6543') console.log(`  ⚠️  porta deveria ser 6543 (transaction pooler)`)
  }

  if (name === 'DIRECT_URL') {
    console.log(`  conexão direta  : ${isDirect ? '✅' : '⚠️  esperado db.xxx.supabase.co'}`)
    if (u.port !== '5432') console.log(`  ⚠️  porta deveria ser 5432`)
  }

  if (needsEncode) {
    const safePass = encodeURIComponent(decoded)
    const safeUrl  = raw.replace(password, safePass)
    console.log(`\n  💡 Versão segura para o Vercel (senha URL-encoded):`)
    console.log(`  ${safeUrl}`)
  }

  console.log()
  return { hostname: u.hostname, port: parseInt(u.port) }
}

const dbInfo     = parseUrl('DATABASE_URL', DATABASE_URL)
const directInfo = parseUrl('DIRECT_URL',   DIRECT_URL)

// Testa conectividade TCP
async function testTcp(host, port) {
  return new Promise((resolve) => {
    const s = createConnection({ host, port, timeout: 5000 })
    s.on('connect', () => { s.destroy(); resolve(true) })
    s.on('error',   () => resolve(false))
    s.on('timeout', () => { s.destroy(); resolve(false) })
  })
}

console.log('Testando conectividade TCP...\n')

const results = await Promise.all([
  dbInfo     ? testTcp(dbInfo.hostname,     dbInfo.port)     : Promise.resolve(false),
  directInfo ? testTcp(directInfo.hostname, directInfo.port) : Promise.resolve(false),
])

console.log(`DATABASE_URL TCP (${dbInfo?.hostname}:${dbInfo?.port}): ${results[0] ? '✅ alcançável' : '❌ não alcançável'}`)
console.log(`DIRECT_URL   TCP (${directInfo?.hostname}:${directInfo?.port}): ${results[1] ? '✅ alcançável' : '❌ não alcançável'}`)
console.log()

if (!results[0]) {
  console.log('⚠️  Se o pooler não é alcançável, verifique se a região da URL está correta')
  console.log('   (ex: sa-east-1, us-east-1, eu-central-1)')
  console.log('   Acesse: Supabase → Project Settings → Database → Connection string\n')
}

console.log('═══════════════════════════════════════════\n')
