'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { TOUR_ROLAR, TOUR_ROLOU, TOUR_TOTAL, tourStore, useTour, type TourState, type TourStep } from '@/lib/tour-store'

/** Porte do renderVals() de SAGA Primeiros Passos.dc.html, sobre o app real. */

const INTRO = [
  'Ah… sangue novo. Seja bem-vindo ao Saga.',
  'Sou Lorde Corvin. Há seiscentos anos registro as histórias dos mortais — e nunca foi tão fácil quanto aqui.',
  'Campanhas, fichas, mesa virtual, dados… Deixe-me mostrar o caminho. São seis ritos rápidos, e prometo não morder.',
]
type Step = { id: TourStep; t: string; s: string; line: string; target?: 'nova' | 'camps' | 'dice'; label?: string; cta?: string; needs?: 1; place?: string; react?: string }
const STEPS: Step[] = [
  { id: 'conta', t: 'Criar sua conta', s: 'Login via Discord realizado', line: 'Sua conta já foi selada pelo Discord. Um rito a menos — a eternidade agradece.' },
  { id: 'campanha', t: 'Fundar uma campanha', s: 'Dê um nome e escolha o sistema', target: 'nova', label: 'Comece por aqui', cta: 'Fundar campanha', line: 'Toda saga precisa de um lar. Funde sua primeira campanha: dê um nome, escolha o sistema e depois convide sua mesa.' },
  { id: 'mestre', t: 'Explorar o Painel do Mestre', s: 'Sessões, NPCs e segredos', needs: 1, target: 'camps', label: 'Sua nova campanha', cta: 'Abrir Painel do Mestre', place: 'o Painel do Mestre', line: 'Como mestre, você governa. No Painel do Mestre ficam as sessões, os NPCs e os segredos que os jogadores não devem ver.', react: 'Viu? Poder e organização — minhas duas paixões. Depois do sangue, claro.' },
  { id: 'npc', t: 'Criar um NPC', s: 'Fichas para personagens não-jogáveis', needs: 1, cta: 'Criar um NPC', place: 'a criação de NPC', line: 'Todo grande mestre precisa de um vilão memorável. Crie seu primeiro NPC… e, se faltar inspiração, conheço um vampiro charmoso.', react: 'Um NPC nasceu. Trate-o bem: vilões guardam rancor por séculos.' },
  { id: 'dado', t: 'Rolar o primeiro dado', s: 'Teste a sorte na rolagem rápida', target: 'dice', label: 'Role um d20 aqui', cta: 'Rolar 1d20', line: 'Antes da mesa, um teste. Role um d20 ali na rolagem rápida — quero ver se a sorte corre em suas veias.' },
  { id: 'mesa', t: 'Abrir a Mesa Virtual', s: 'Mapa, tokens e rolagens ao vivo', needs: 1, cta: 'Abrir a Mesa', place: 'a Mesa Virtual', line: 'Por fim, a Mesa Virtual: mapa, tokens, iniciativa e rolagens ao vivo com todo o grupo. É onde a noite acontece.', react: 'A mesa está posta. Seus jogadores verão cada movimento em tempo real.' },
]
const NEEDS = 'Paciência, mortal. Primeiro precisamos de uma campanha — sem ela não há mesa, nem mestre, nem vilão.'
const FINAL = 'Sua saga começou. Estarei por perto — basta clicar no meu retrato. Agora, se me der licença… o sol está nascendo.'
const ROM = ['I', 'II', 'III', 'IV', 'V', 'VI']
// Rótulo do modal → sistema pré-definido (lib/systems-seed.ts). Sem pré-definido, a API cria um sistema com esse nome.
const SISTEMAS: [string, string][] = [['D&D 5e', 'D&D 5e'], ['Tormenta20', 'Tormenta20'], ['VtM V5', 'Vampire: The Masquerade V5'], ['Call of Cthulhu', 'Call of Cthulhu 7e'], ['Ordem Paranormal', 'Ordem Paranormal'], ['Outro', 'Personalizado']]

/** O que o servidor sabe do usuário (app/(app)/layout.tsx). */
export type TourDados = { gmCampaignId: string | null; campaignId: string | null; temNpc: boolean }

// Chaves antigas do OnboardingChecklist: quem já visitou continua com o rito feito.
const VISITOU: Partial<Record<TourStep, string>> = { mestre: 'saga_visited_gm', npc: 'saga_visited_npc', mesa: 'saga_visited_mesa' }
const lsTrue = (k: string) => { try { return localStorage.getItem(k) === 'true' } catch { return false } }

export function useTourVals(d: TourDados) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const tour = useTour()
  const [reaction, setReaction] = useState<string | null>(null)
  const [final, setFinal] = useState(false)
  const [introIdx, setIntroIdx] = useState(0)
  const [typed, setTyped] = useState(0)
  const [modal, setModal] = useState(false)
  const [mName, setMName] = useState('')
  const [mSys, setMSys] = useState('D&D 5e')
  const [mTipo, setMTipo] = useState<'Campanha' | 'One-shot'>('Campanha')
  const [sealing, setSealing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [spot, setSpot] = useState<{ x: number; y: number; w: number; h: number; ly: number; label?: string } | null>(null)
  const lineRef = useRef<string>('')
  const tw = useRef<ReturnType<typeof setInterval>>()
  const sk = useRef<TourStep | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  // Estado inicial: ?tour=1 abre a apresentação; quem já tinha dispensado o checklist antigo começa fechado.
  useEffect(() => {
    tourStore.init(() => {
      const done: TourState['done'] = { conta: 1 }
      if (d.campaignId) done.campanha = 1
      if (d.temNpc) done.npc = 1
      for (const [k, key] of Object.entries(VISITOU)) if (lsTrue(key!)) done[k as TourStep] = 1
      const all = Object.keys(done).length === TOUR_TOTAL
      return { phase: lsTrue('saga_checklist_dismissed') || all ? 'closed' : 'min', done, cur: 'campanha' }
    })
    return () => { clearInterval(tw.current); timers.current.forEach(clearTimeout) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (params.get('tour') === '1') { tourStore.set(s => ({ ...s, phase: 'intro' })); setIntroIdx(0) }
  }, [params])

  const s: TourState = tour ?? { phase: 'closed', done: { conta: 1 }, cur: 'campanha' }
  const ph = s.phase
  const step = (id?: TourStep) => STEPS.find(x => x.id === (id ?? s.cur))!
  const st = step()
  const line = ph === 'intro' ? INTRO[introIdx] : final ? FINAL : reaction ? reaction : st.needs && !s.done.campanha ? NEEDS : st.line

  // Máquina de escrever: 2 letras a cada 22 ms.
  useEffect(() => {
    if (line === lineRef.current) return
    lineRef.current = line
    clearInterval(tw.current)
    setTyped(0)
    tw.current = setInterval(() => setTyped(t => { if (t >= lineRef.current.length) { clearInterval(tw.current); return t } return t + 2 }), 22)
  }, [line])

  const complete = (id: TourStep, react?: string) => {
    tourStore.set(x => ({ ...x, done: { ...x.done, [id]: 1 }, cur: id, phase: x.phase === 'closed' ? 'closed' : 'guide' }))
    setReaction(react ?? null); setFinal(false)
  }

  // Rolagem feita em qualquer tela (rolagem rápida do Início) conclui o rito do dado.
  useEffect(() => {
    const onRoll = (e: Event) => {
      const { sides, v } = (e as CustomEvent<{ sides: number; v: number }>).detail
      const cur = tourStore.get()
      if (!cur || cur.done.dado || cur.phase === 'intro') return
      const crit = sides === 20 && v === 20, fail = sides === 20 && v === 1
      complete('dado', crit ? 'Vinte natural! Eu sabia que havia algo especial no seu sangue.' : fail ? 'Um. Bem… até os heróis precisam de humildade.' : sides !== 20 ? `Um d${sides}? Ousado. Deu ${v} — e toda rolagem fica registrada no log da sessão.` : `${v}. Respeitável. Toda rolagem fica registrada no log da sessão, para a posteridade.`)
    }
    window.addEventListener(TOUR_ROLOU, onRoll)
    return () => window.removeEventListener(TOUR_ROLOU, onRoll)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Spotlight: mede o elemento real marcado com data-tour (só existe no Início).
  const spotStep = ph !== 'guide' || modal || reaction || final || toast ? null : (!st.target || s.done[st.id] || (st.needs && !s.done.campanha)) ? null : st
  useEffect(() => {
    const measure = () => {
      const el = spotStep && document.querySelector<HTMLElement>(`[data-tour="${spotStep.target}"]`)
      if (!el || !spotStep) { sk.current = null; setSpot(o => (o ? null : o)); return }
      const r = el.getBoundingClientRect(), p = 6
      if (sk.current !== spotStep.id) {
        sk.current = spotStep.id
        if (r.top < 70 || r.bottom > innerHeight - 20) (document.scrollingElement || document.documentElement).scrollBy({ top: r.top - 140, behavior: 'smooth' })
      }
      const n = { x: Math.round(r.left - p), y: Math.round(r.top - p), w: Math.round(r.width + p * 2), h: Math.round(r.height + p * 2), label: spotStep.label, ly: 0 }
      n.ly = n.y > 80 ? n.y - 36 : n.y + n.h + 8
      setSpot(o => (o && o.x === n.x && o.y === n.y && o.w === n.w && o.h === n.h && o.label === n.label ? o : n))
    }
    measure()
    const mv = setInterval(measure, 150)
    return () => clearInterval(mv)
  }, [spotStep, pathname])

  // Ritos de visita: aviso de 1 s e vai para a página (o rito conta como feito, como no design).
  const destino: Partial<Record<TourStep, string | null>> = {
    mestre: d.gmCampaignId && `/campaign/${d.gmCampaignId}`,
    npc: d.gmCampaignId && `/campaign/${d.gmCampaignId}/npcs`,
    mesa: d.campaignId && `/campaign/${d.campaignId}/mesa`,
  }
  const visit = (x: Step) => {
    if (toast) return
    setToast(`Abrindo ${x.place}…`)
    timers.current.push(setTimeout(() => {
      setToast(null); complete(x.id, x.react)
      const href = destino[x.id]; if (href) router.push(href)
    }, 1000))
  }
  const next = () => {
    const i = STEPS.findIndex(x => x.id === s.cur)
    const nx = [...STEPS.slice(i + 1), ...STEPS.slice(0, i + 1)].find(x => !s.done[x.id])
    if (nx) { tourStore.set(x => ({ ...x, cur: nx.id })); setReaction(null) } else { setFinal(true); setReaction(null) }
  }
  const setPhase = (phase: TourState['phase']) => tourStore.set(x => ({ ...x, phase }))
  const openModal = () => { setModal(true); setMName(''); setSealing(false) }
  const cta = () => {
    if (final) return setPhase('closed')
    if (reaction || s.done[st.id]) return next()
    if (st.id === 'campanha' || (st.needs && !s.done.campanha)) return openModal()
    if (st.id === 'dado') {
      if (pathname === '/dashboard') window.dispatchEvent(new CustomEvent(TOUR_ROLAR))
      else router.push('/dashboard')
      return
    }
    visit(st)
  }
  const createCamp = async () => {
    if (sealing) return
    const n = mName.trim() || 'Minha Primeira Crônica'
    setSealing(true)
    const res = await fetch('/api/campaigns', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: n, systemName: SISTEMAS.find(([l]) => l === mSys)?.[1] ?? null, campaignType: mTipo === 'One-shot' ? 'oneshot' : 'campaign' }),
    }).catch(() => null)
    const camp = res?.ok ? await res.json().catch(() => null) as { id?: string } | null : null
    timers.current.push(setTimeout(() => {
      setModal(false); setSealing(false)
      if (!camp?.id) return
      complete('campanha', `“${n}”… um nome digno. Já carrega o meu selo. Agora, a parte que mais aprecio: o poder.`)
      router.refresh() // a campanha nova aparece no Início e nos atalhos
    }, 800))
  }
  const restart = () => {
    (document.scrollingElement || document.documentElement).scrollTo({ top: 0 })
    tourStore.set(x => ({ ...x, phase: 'intro', cur: 'campanha' })); setIntroIdx(0); setReaction(null); setFinal(false)
  }

  const nDone = STEPS.filter(x => s.done[x.id]).length, allDone = nDone === STEPS.length
  let ctaLabel = st.cta ?? '', cta2Label = 'Depois'
  if (final) { ctaLabel = 'Fechar guia'; cta2Label = 'Refazer tour' }
  else if (reaction || s.done[st.id]) ctaLabel = allDone ? 'Concluir' : 'Próximo rito →'
  else if (st.needs && !s.done.campanha) ctaLabel = 'Fundar campanha'

  return {
    isIntro: ph === 'intro', showWidget: ph === 'guide' || ph === 'min', isOpen: ph === 'guide', isMin: ph === 'min',
    wW: ph === 'min' ? '70px' : '360px', wR: ph === 'min' ? '50%' : '8px', wPad: ph === 'min' ? '3px' : '14px 14px 12px',
    pct: Math.round(nDone / STEPS.length * 100), progLabel: `${nDone}/${STEPS.length}`, remaining: STEPS.length - nDone,
    typedText: line.slice(0, typed), caretDisp: typed < line.length ? 'inline-block' : 'none', talking: typed < line.length,
    skipType: () => setTyped(9999),
    isFinal: final,
    steps: STEPS.map((x, i) => {
      const dn = !!s.done[x.id], c = x.id === s.cur && !final, locked = x.needs && !s.done.campanha
      return {
        t: x.t, s: dn ? 'Concluído' : locked ? 'Requer uma campanha' : x.s, ic: dn ? '✓' : ROM[i],
        bc: dn ? 'transparent' : c ? '#e8c46a' : 'rgb(241 227 194/.28)', ib: dn ? 'radial-gradient(circle at 35% 30%, #c95a3a, #a8262f 45%, #5a1015)' : 'transparent',
        icol: dn ? '#f6ecd6' : c ? '#e8c46a' : '#9a8a72', ia: c && !dn ? 'tour-ringPulse 1.8s infinite' : 'none',
        tc: dn ? '#9a8a72' : locked ? '#bba98a' : '#f1e3c2', td: dn ? 'line-through' : 'none', bg: c ? 'rgb(241 227 194/.08)' : 'transparent',
        go: () => { tourStore.set(y => ({ ...y, cur: x.id })); setReaction(null); setFinal(false) },
      }
    }),
    ctaLabel, cta2Label,
    ctaGo: cta, cta2Go: () => (final ? restart() : setPhase('min')),
    minimize: () => setPhase('min'), expand: () => setPhase('guide'), closeGuide: () => setPhase('closed'),
    hasSpot: !!spot, spot: spot ?? { x: 0, y: 0, w: 0, h: 0, ly: 0, label: '' },
    hasToast: !!toast, toast,
    modal, sealing, mName, onMName: (e: ChangeEvent<HTMLInputElement>) => setMName(e.target.value),
    closeModal: () => setModal(false), createCamp,
    sistemas: SISTEMAS.map(([l]) => ({ l, go: () => setMSys(l), bg: mSys === l ? 'var(--accent-t)' : 'var(--surface)', color: mSys === l ? 'var(--accent)' : 'var(--ink)', ring: mSys === l ? 'var(--accent)' : 'var(--line)' })),
    tipos: (['Campanha', 'One-shot'] as const).map(l => ({ l, go: () => setMTipo(l), bg: mTipo === l ? 'var(--surface)' : 'transparent', color: mTipo === l ? 'var(--ink)' : 'var(--muted)', sh: mTipo === l ? '0 1px 2px rgb(0 0 0/.08)' : 'none' })),
    introDots: [0, 1, 2].map(i => ({ w: i === introIdx ? 22 : 6, bg: i <= introIdx ? '#c9a22a' : 'rgb(241 227 194/.25)' })),
    introPrimaryLabel: introIdx < 2 ? 'Continuar' : 'Mostre o caminho', introSecondaryLabel: introIdx < 2 ? 'Pular apresentação' : 'Explorar sozinho',
    introPrimary: () => {
      if (typed < line.length) return setTyped(9999)
      if (introIdx < 2) setIntroIdx(introIdx + 1)
      else { tourStore.set(x => ({ ...x, phase: 'guide', cur: 'campanha' })); setReaction(null) }
    },
    introSecondary: () => tourStore.set(x => ({ ...x, phase: introIdx < 2 ? 'guide' : 'min', cur: 'campanha' })),
  }
}

export type Vals = ReturnType<typeof useTourVals>
