// Recorta peças do Template gerado de "SAGA Ficha Inventario" para components/inventario/Inventario.tsx:
// o botão "Ganhar XP" (com o popover), o aviso de nível novo e o inventário (itens, bolsa, carga e CA).
// Uso: node scripts/recortar-inventario.js   (rode depois de regenerar o Template com dc-gerar)
const fs = require('fs')
const path = require('path')
const raiz = path.resolve(__dirname, '..')
const tpl = fs.readFileSync(path.join(raiz, 'apps/web/src/components/screens/fichainventario/Template.tsx'), 'utf8')

// Elemento <tag> que contém `ancora` (o mais próximo antes dela), com tags aninhadas balanceadas.
function envolvendo(c, ancora, tag) {
  const i = c.indexOf(ancora)
  if (i < 0) throw new Error(`âncora não achada: ${ancora}`)
  const s = c.lastIndexOf(`<${tag}`, i)
  let depth = 0, p = s
  for (;;) {
    const abre = c.indexOf(`<${tag}`, p + 1), fecha = c.indexOf(`</${tag}>`, p + 1)
    if (abre >= 0 && abre < fecha) {
      // tag auto-fechada não conta
      let b = 0, k = abre, auto = false
      for (; k < c.length; k++) { const ch = c[k]; if (ch === '{') b++; else if (ch === '}') b--; else if (ch === '>' && b === 0) { auto = c[k - 1] === '/'; break } }
      if (!auto) depth++
      p = abre; continue
    }
    if (depth === 0) return c.slice(s, fecha + `</${tag}>`.length)
    depth--; p = fecha
  }
}

const xp = envolvendo(tpl, 'onClick={v.xpToggle}', 'div')
const nivelIni = tpl.indexOf('{v.lvlUp && (')
const nivel = '{v.lvlUp && (' + envolvendo(tpl, 'onClick={v.lvlOk}', 'div') + ')}'
if (nivelIni < 0) throw new Error('aviso de nível não achado')
const inv = envolvendo(tpl, "<section style={{ flex: '999 1 560px'", 'div')
// Textos do protótipo → dados reais; CA só nas fichas que têm (a personalizada não).
const troca = (c, a, b) => { if (c.split(a).length !== 2) throw new Error(`esperava 1 ocorrência: ${a}`); return c.replace(a, () => b) }
const nivelReal = troca(nivel, "{'Sir Aldric chegou ao nível '}", '{`${v.nomeCurto} chegou ao nível `}')
let invReal = troca(inv, "{' / 120 kg'}", '{` / ${v.cargaMax} kg`}')
const caIni = invReal.indexOf("<div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed var(--line)' }}>")
const caFim = invReal.indexOf('{v.caLine}</p>') + '{v.caLine}</p>'.length
if (caIni < 0 || caFim < caIni) throw new Error('bloco de CA não achado')
invReal = invReal.slice(0, caIni) + '{v.temCa && (<>' + invReal.slice(caIni, caFim) + '</>)}' + invReal.slice(caFim)
const icones = (tpl.match(/import \{([^}]*)\} from 'lucide-react'/) || [])[1] || ''

const out = `'use client'

/* Recortado de screens/fichainventario/Template.tsx (SAGA Ficha Inventario) por
   scripts/recortar-inventario.js. Não edite à mão: regenere o Template e rode o script.
   Peças usadas na Ficha de D&D e na Ficha Personalizada; a lógica é lib/inventario.ts. */

import {${icones}} from 'lucide-react'
import { DynIcon } from '@/components/ui/saga'
import type { InvVals } from '@/lib/inventario'
import '@/components/screens/fichainventario/fichainventario.css'

/** Botão "Ganhar XP" com o popover (quantia, motivo, atalhos e histórico). */
export function XpBotao({ v }: { v: InvVals }) {
  return (${xp})
}

/** Aviso de nível novo (aparece ao cruzar um limiar de XP). */
export function XpNivel({ v }: { v: InvVals }) {
  return (<>${nivelReal}</>)
}

/** Inventário, bolsa, carga e classe de armadura. */
export function Inventario({ v }: { v: InvVals }) {
  return (${invReal})
}
`
const destino = path.join(raiz, 'apps/web/src/components/inventario/Inventario.tsx')
fs.mkdirSync(path.dirname(destino), { recursive: true })
fs.writeFileSync(destino, out)
console.log('ok', destino)
