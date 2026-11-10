// Porta Saga NOVO/Corvin.dc.html para apps/web/src/components/corvin/Corvin.tsx (+ corvin.css).
// Uso: node scripts/corvin-jsx.js [caminho do .dc.html]
const fs = require('fs')
const path = require('path')
const raiz = path.resolve(__dirname, '..')
const fonte = process.argv[2] || path.join(raiz, 'Saga NOVO/Corvin.dc.html')
const html = fs.readFileSync(fonte, 'utf8')

const css = html.slice(html.indexOf('<style>') + 7, html.indexOf('</style>')).trim()
let svg = html.slice(html.indexOf('</helmet>') + 9, html.indexOf('<script type="text/x-dc"')).trim().replace(/<\/x-dc>\s*$/, '').trim()
svg = svg.replace(/<!--[\s\S]*?-->/g, '')

const camel = s => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
// {{ x }} → ${x} (as variáveis existem no componente)
const tpl = v => v.replace(/\{\{\s*([a-zA-Z]+)\s*\}\}/g, '${$1}')
const valor = v => (v.includes('{{') ? `{\`${tpl(v)}\`}` : JSON.stringify(v))

svg = svg.replace(/\s([a-zA-Z:-]+)="([^"]*)"/g, (_, nome, v) => {
  if (nome === 'style') {
    const props = v.split(';').map(p => p.trim()).filter(Boolean).map(p => {
      const i = p.indexOf(':'), k = camel(p.slice(0, i).trim()), val = p.slice(i + 1).trim()
      return `${k}: ${val.includes('{{') ? `\`${tpl(val)}\`` : JSON.stringify(val)}`
    })
    return ` style={{ ${props.join(', ')} }}`
  }
  const n = nome === 'class' ? 'className' : nome.startsWith('aria-') || nome.startsWith('data-') ? nome : camel(nome)
  return ` ${n}=${valor(v)}`
})

const out = `'use client'

import { useId } from 'react'
import './corvin.css'

/*
 * Lorde Corvin, o vampiro cronista (guia do tutorial), em gravura de nanquim.
 * Gerado por scripts/corvin-jsx.js a partir de Saga NOVO/Corvin.dc.html: não edite à mão.
 * \`medalhao\` recorta o rosto (viewBox 80 76 120 120); os ids levam um sufixo por
 * instância porque retrato e medalhão podem estar na mesma página.
 */
export function Corvin({ variante = 'retrato', falando = false }: { variante?: 'retrato' | 'medalhao'; falando?: boolean }) {
  const u = useId().replace(/:/g, '')
  const med = variante === 'medalhao'
  const vb = med ? '80 76 120 120' : '0 0 280 370'
  const modeClass = med ? 'cv-med' : 'cv-ret'
  const figT = med ? 'translate(140 136) scale(.66) translate(-140 -146)' : 'translate(0 0)'
  const clip = med ? \`url(#cvMed-\${u})\` : 'none'
  const tex = med ? 'none' : \`url(#cvPaper-\${u})\`
  const mouthOpen = falando ? 1 : 0.18
  const mouthAnim = falando ? 'corvTalk .26s ease-in-out infinite' : 'none'
  return (
    ${svg}
  )
}
`
const dir = path.join(raiz, 'apps/web/src/components/corvin')
fs.writeFileSync(path.join(dir, 'Corvin.tsx'), out)
fs.writeFileSync(path.join(dir, 'corvin.css'), `/* Gerado por scripts/corvin-jsx.js (Saga NOVO/Corvin.dc.html). */\n${css}\n`)
console.log('ok')
