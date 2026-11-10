// Leva as peças de "SAGA Mensagens Mestre" para a tela Mensagens (Template ajustado à mão):
// botão "Fixar" nas mensagens, cartão do sussurro para o mestre, barra "Para a campanha / Sussurro
// selado" com destinatário e o cartão do recado fixado. Rodar uma vez depois de gerar
// screens/msgmestre/Template.tsx (prefixo msgmestre); o script apaga esse Template no fim.
const fs = require('fs')
const path = require('path')
const raiz = path.resolve(__dirname, '..')
const dirM = path.join(raiz, 'apps/web/src/components/screens/msgmestre')
const fonte = fs.readFileSync(path.join(dirM, 'Template.tsx'), 'utf8')
const alvoP = path.join(raiz, 'apps/web/src/components/screens/mensagens/Template.tsx')
let alvo = fs.readFileSync(alvoP, 'utf8')

// Elemento <tag> que começa em `s` (tags aninhadas balanceadas).
function ate(c, s, tag) {
  let depth = 0, p = s
  for (;;) {
    const abre = c.indexOf(`<${tag}`, p + 1), fecha = c.indexOf(`</${tag}>`, p + 1)
    if (abre >= 0 && abre < fecha) {
      let b = 0, k = abre, auto = false
      for (; k < c.length; k++) { const ch = c[k]; if (ch === '{') b++; else if (ch === '}') b--; else if (ch === '>' && b === 0) { auto = c[k - 1] === '/'; break } }
      if (!auto) depth++
      p = abre; continue
    }
    if (depth === 0) return c.slice(s, fecha + `</${tag}>`.length)
    depth--; p = fecha
  }
}
const envolvendo = (c, ancora, tag) => { const i = c.indexOf(ancora); if (i < 0) throw new Error(`âncora: ${ancora}`); return ate(c, c.lastIndexOf(`<${tag}`, i), tag) }
const um = (c, a, b) => { if (c.split(a).length !== 2) throw new Error(`esperava 1: ${a.slice(0, 60)}`); return c.replace(a, () => b) }

const pinBtn = `{m.canPin && (${envolvendo(fonte, 'onClick={m.pin}', 'button')})}`
const gmCard = `{m.sealedGM && (${envolvendo(fonte, 'Sussurro para @', 'div')})}`
const iGm = fonte.indexOf('{v.isGM && (')
const gmBar = `{v.isGM && (${ate(fonte, iGm + '{v.isGM && ('.length, 'div')})}`.replace(/v\.modes\b/g, 'v.gmModes')
let pin = envolvendo(fonte, '>Recado fixado<', 'section')
pin = um(pin, '>Próxima sessão: quarta, 11 nov · 20h<', '>{`Próxima sessão: ${v.cur.next}`}<')

alvo = um(alvo, '{m.meta}</span>', `{m.meta}</span>${pinBtn}`)
alvo = um(alvo, '{m.isWhisper && (', `${gmCard}{m.isWhisper && (`)
const iIn = alvo.lastIndexOf('<div', alvo.indexOf('ref={v.inputRef}'))
alvo = alvo.slice(0, iIn) + gmBar + alvo.slice(iIn)
const iPin = alvo.indexOf('{v.cur.pin}')
const h3 = alvo.lastIndexOf('<h3', iPin), fimP = alvo.indexOf('</p>', iPin) + 4
alvo = alvo.slice(0, h3) + pin + alvo.slice(fimP)

// Ícones e CSS das peças.
const icones = s => ((s.match(/import \{([^}]*)\} from 'lucide-react'/) || [])[1] || '').split(',').map(x => x.trim()).filter(Boolean)
// "Lock as LockIcon": o nome usado no JSX é o depois do "as".
const usado = n => { const nome = n.split(' as ').pop(); return alvo.includes(`<${nome} `) || alvo.includes(`<${nome}/`) }
const todos = Array.from(new Set([...icones(alvo), ...icones(fonte)])).filter(usado).sort()
alvo = alvo.replace(/import \{[^}]*\} from 'lucide-react'/, `import { ${todos.join(', ')} } from 'lucide-react'`)
alvo = um(alvo, "import './mensagens.css'", "import './mensagens.css'\nimport '../msgmestre/msgmestre.css'")
alvo = alvo.replace('lógica em vals.ts.', 'lógica em vals.ts.\n   Peças de SAGA Mensagens Mestre (scripts/mensagens-mestre.js): Fixar, sussurro do mestre, barra de sussurro e recado fixado.')
fs.writeFileSync(alvoP, alvo)
fs.unlinkSync(path.join(dirM, 'Template.tsx'))
console.log('ok')
