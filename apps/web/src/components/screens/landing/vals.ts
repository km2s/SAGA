'use client'

import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Bot, BookOpen, Map as MapIcon, ScrollText, type LucideIcon } from 'lucide-react'
import { dcHref } from '@/lib/dc-routes'
import { toggleTema } from '@/lib/tema'

/** Porte do renderVals() de SAGA Landing.dc.html. Animações com prefixo `landing-` (landing.css). */

// Vitrine da página de apresentação (texto do design, não dado de usuário).
const SPOTS = {
  mesa: { title: 'Uma mesa virtual que não atrapalha o jogo.', lead: 'Mapa, tokens e dados sincronizados com todo o grupo em tempo real — sem instalar nada.', items: [
    { t: 'Tokens e grade com encaixe', d: 'Arraste jogadores, inimigos e NPCs; a vida aparece no próprio token.' },
    { t: 'Névoa de guerra', d: 'Revele salas conforme o grupo avança.' },
    { t: 'Iniciativa automática', d: 'Turnos em ordem, com destaque para quem age.' },
    { t: 'Régua e marcadores', d: 'Meça distâncias e faça pings para todos.' },
    { t: 'Trilha sonora', d: 'Toque música do YouTube para a mesa inteira.' }] },
  fichas: { title: 'Fichas que conhecem o seu sistema.', lead: 'Modelos prontos para 27 sistemas — de D&D 5e a Vampiro V5 — ou crie o seu.', items: [
    { t: 'Rolagem direto da ficha', d: 'Clique num atributo e o resultado vai para o log.' },
    { t: 'Recursos e magias', d: 'Espaços de magia, Fome, Sanidade… cada sistema com os seus.' },
    { t: 'Importação', d: 'Traga fichas de outras plataformas.' },
    { t: 'Compartilhamento', d: 'Mostre ou esconda a ficha do restante da mesa.' }] },
  mestre: { title: 'O painel do mestre, sem a pilha de papel.', lead: 'Sessões, NPCs, notas e segredos — organizados por campanha.', items: [
    { t: 'Sessões com resumo', d: 'Agende, registre e recupere o que aconteceu.' },
    { t: 'NPCs com visibilidade', d: 'Revele aos jogadores só quando for a hora.' },
    { t: 'Inscrições', d: 'Aceite novos jogadores pela Taverna.' },
    { t: 'Avisos no Discord', d: 'O bot lembra a mesa antes de cada sessão.' }] },
}
type Tab = keyof typeof SPOTS

const PARTY = ([['Lyra', 81, '#b8492a'], ['Thorin', 85, '#b98a2a'], ['Isolde', 58, '#4f7a3a'], ['Bram', 32, '#6b5a8a']] as const)
  .map(([n, p, bg]) => ({ n, i: n[0], pct: p, bg, bar: p > 50 ? 'var(--ok)' : p > 25 ? 'var(--gold)' : 'var(--accent)' }))
const ATTRS = ([['FOR', 14], ['DES', 16], ['CON', 13], ['INT', 12], ['SAB', 15], ['CAR', 10]] as const).map(([k, v]) => ({ k, v }))
const SISTEMAS = ['D&D 5e', 'Tormenta20', 'Vampiro V5', 'Call of Cthulhu', 'Pathfinder 2e', 'Ordem Paranormal', 'Cyberpunk Red', 'Lobisomem', 'Old Dragon 2', 'Shadowrun 6e', 'Mothership', 'Savage Worlds']
const MARQUEE = [...SISTEMAS, ...SISTEMAS]
const FEATURES: { icon: LucideIcon; t: string; d: string }[] = [
  { icon: ScrollText, t: 'Campanhas', d: 'Sessões, membros, notas e convites num só lugar — como mestre ou jogador.' },
  { icon: BookOpen, t: 'Fichas inteligentes', d: 'Modelos para 27 sistemas, com rolagem por atributo e recursos de cada jogo.' },
  { icon: MapIcon, t: 'Mesa virtual', d: 'Mapa, tokens, névoa, iniciativa e música ao vivo para todo o grupo.' },
  { icon: Bot, t: 'Bot do Discord', d: 'Login, lembretes de sessão e rolagens direto no servidor da mesa.' },
]
const RITOS = [
  { n: 'I', t: 'Entre com Discord, Google ou e-mail', d: 'Em segundos. Seu nome e avatar podem vir do Discord.' },
  { n: 'II', t: 'Funde sua campanha', d: 'Escolha o sistema, dê um nome e defina a frequência das sessões.' },
  { n: 'III', t: 'Convide sua mesa', d: 'Mande o código de convite ou abra vagas na Taverna.' },
]

function useWidth() {
  const [w, setW] = useState(1440)
  useEffect(() => {
    const rs = () => setW(window.innerWidth)
    rs(); window.addEventListener('resize', rs)
    return () => window.removeEventListener('resize', rs)
  }, [])
  return w
}

export function useLandingVals() {
  const w = useWidth()
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const [face, setFace] = useState(20)
  const [rolling, setRolling] = useState(false)
  const [rolled, setRolled] = useState<number | null>(null)
  const [tab, setTab] = useState<Tab>('mesa')
  const iv = useRef<ReturnType<typeof setInterval>>()
  const td = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => () => { clearInterval(iv.current); clearTimeout(td.current) }, [])

  const roll = () => {
    if (rolling) return
    const r = 1 + Math.floor(Math.random() * 20)
    setRolling(true); setRolled(null)
    iv.current = setInterval(() => setFace(1 + Math.floor(Math.random() * 20)), 60)
    td.current = setTimeout(() => { clearInterval(iv.current); setRolling(false); setFace(r); setRolled(r) }, 900)
  }

  const v = rolled
  return {
    $href: (link: string) => dcHref(link),
    // TODO(conteúdo): imagens da vitrine (capa e retrato) — sem elas fica o gradiente do design.
    $img: (_id: string): string | null => null,
    navWide: w < 1100 ? 'none' : 'block', navShow: w < 720 ? 'none' : 'flex',
    toggleTema,
    tiltX: ty, tiltY: tx,
    onTilt: (e: MouseEvent<HTMLElement>) => {
      const r = e.currentTarget.getBoundingClientRect()
      setTx(+(((e.clientX - r.left) / r.width - 0.5) * 10).toFixed(1))
      setTy(+(-((e.clientY - r.top) / r.height - 0.5) * 8).toFixed(1))
    },
    offTilt: () => { setTx(0); setTy(0) },
    party: PARTY,
    attrs: ATTRS,
    roll, face,
    dieAnim: rolling ? 'landing-spin .9s cubic-bezier(.2,.7,.3,1) both' : 'landing-float 4s ease-in-out infinite',
    msg: rolling ? 'Rolando…' : v == null ? 'Clique no dado' : v === 20 ? 'Vinte natural! A saga te chama.' : v === 1 ? 'Um. Começo humilde.' : v >= 15 ? `${v}. Os deuses sorriem.` : `${v}. Nada mal, aventureiro.`,
    msgColor: v === 20 ? '#f3dc94' : '#cdbb98',
    marquee: MARQUEE,
    features: FEATURES,
    spot: SPOTS[tab], spotMesa: tab === 'mesa', spotFichas: tab === 'fichas', spotMestre: tab === 'mestre',
    spotTabs: ([['mesa', 'Mesa virtual'], ['fichas', 'Fichas'], ['mestre', 'Painel do Mestre']] as const).map(([k, l]) => ({
      l, go: () => setTab(k),
      bg: tab === k ? 'var(--surface)' : 'transparent', color: tab === k ? 'var(--ink)' : 'var(--muted)', sh: tab === k ? '0 1px 2px rgb(0 0 0/.08)' : 'none',
    })),
    ritos: RITOS,
  }
}

export type Vals = ReturnType<typeof useLandingVals>
