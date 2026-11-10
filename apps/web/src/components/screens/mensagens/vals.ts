'use client'

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { CircleAlert, Loader, Lock, MessagesSquare } from 'lucide-react'
import { dcHref } from '@/lib/dc-routes'
import { MENSAGENS_LIDAS } from '@/components/header/AppHeader'

/**
 * Porte do renderVals() de SAGA Mensagens.dc.html. Canal da campanha = mensagens
 * (tabela Mensagem) + chat e rolagens da sessão ao vivo (RollLog). Diretas entre
 * quem divide alguma campanha. Sussurro selado, recado fixado e "escrevendo…"
 * (SAGA Mensagens Mestre): o servidor só entrega o sussurro a quem mandou e a quem recebe.
 */
export type Registro = { id: string; rolledBy: string; expression: string; attribute: string | null; total: number; rolls: unknown; rolledAt: string; personagem?: string | null; fonte?: 'msg'; para?: string | null; aberto?: boolean }
type Canal = {
  id: string; tipo: 'camp' | 'dm'; n: string; sys: string; mestre: string; souMestre: boolean; membros: number; personagem: string | null
  aoVivo: string | null; proxima: string | null; registros: Registro[]; handouts: string[]; avatar: string | null
  recado: { texto: string; em: string | null } | null
  /** Mestre: para quem pode sussurrar (userId e @). */
  jogadores: { id: string; u: string }[]
}
export type MensagensDados = {
  eu: string
  canais: Canal[]; diretas: Canal[]
  naoLidas: Record<string, number>
  inicial: string | null
}
type Pend = { id: string; camp: string; x: string; ic: string | null; live: boolean; para: string | null; st: 'sending' | 'failed' }

const AV = ['#8f3a24', '#6a2817', '#3a6a7a', '#b8492a', '#b98a2a', '#4f7a3a', '#6b5a8a']
const COVERS = ['linear-gradient(135deg,#2a1c08,#c9a22a)', 'linear-gradient(135deg,#0b0c11,#6a2817)', 'linear-gradient(135deg,#0e1a1c,#3a5a5a)']
const cor = (nome: string) => AV[[...nome].reduce((a, c) => a + c.charCodeAt(0), 0) % AV.length]
const post = (url: string, body: unknown) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null)

export function useMensagensVals(d: MensagensDados) {
  const todos = [...d.diretas, ...d.canais]
  const [conv, setConv] = useState(d.inicial && todos.some(x => x.id === d.inicial) ? d.inicial : d.canais[0]?.id ?? d.diretas[0]?.id ?? '')
  const [unread, setUnread] = useState(d.naoLidas)
  const [mode, setMode] = useState<'ooc' | 'ic'>('ooc')
  const [draft, setDraft] = useState('')
  const [regs, setRegs] = useState<Record<string, Registro[]>>(() => Object.fromEntries(todos.map(c => [c.id, c.registros])))
  const [fresh, setFresh] = useState<string | null>(null)
  const [rollingId, setRollingId] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [mounted, setMounted] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const c = todos.find(x => x.id === conv) ?? null
  const dm = c?.tipo === 'dm'
  const lista = regs[conv] ?? []
  const personagem = c?.personagem ?? 'Mestre'
  // Mestre: "Para a campanha" ou "Sussurro selado" para uma pessoa.
  const [gmMode, setGmMode] = useState<'mesa' | 'sussurro'>('mesa')
  const [to, setTo] = useState<string | null>(null)
  const isGM = !!c && !dm && c.souMestre && c.jogadores.length > 0
  const alvo = c?.jogadores.find(j => j.id === to) ?? c?.jogadores[0] ?? null
  const whisper = isGM && gmMode === 'sussurro' && !!alvo
  // Recado fixado por conversa; edição só do mestre.
  const [recados, setRecados] = useState<Record<string, { texto: string; em: string | null } | null>>(() => Object.fromEntries(todos.map(x => [x.id, x.recado])))
  const [pinEditing, setPinEditing] = useState(false)
  const [pinDraft, setPinDraft] = useState('')
  const recado = recados[conv] ?? null
  const fixar = (texto: string | null) => { if (c && !dm) void fetch(`/api/campaigns/${c.id}/recado`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto }) }).catch(() => null) }
  // Quem está escrevendo (vem junto da sondagem) e o meu sinal, no máximo a cada 3 s.
  const [escrevendo, setEscrevendo] = useState<string[]>([])
  const ultimoSinal = useRef(0)
  const [abrindo, setAbrindo] = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { const el = listRef.current; if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight }) }, [conv, lista.length])

  // Abrir uma conversa (ou chegar mensagem nela) marca como lida; o selo do header atualiza.
  useEffect(() => {
    if (!conv) return
    setUnread(u => (u[conv] ? { ...u, [conv]: 0 } : u))
    void post('/api/mensagens/lido', { conversa: conv }).then(() => window.dispatchEvent(new Event(MENSAGENS_LIDAS)))
  }, [conv, lista.length])
  // Contadores das outras conversas.
  useEffect(() => {
    const iv = setInterval(async () => {
      const r = await fetch('/api/mensagens/lido').catch(() => null)
      const j = r?.ok ? await r.json().catch(() => null) as { porConversa?: Record<string, number> } | null : null
      if (j?.porConversa) setUnread({ ...j.porConversa, [conv]: 0 })
    }, 20_000)
    return () => clearInterval(iv)
  }, [conv])

  // Mensagens novas da conversa aberta (tabela Mensagem) a cada 5 s.
  useEffect(() => {
    if (!conv) return
    const iv = setInterval(async () => {
      const ult = (regs[conv] ?? []).filter(x => x.fonte === 'msg').at(-1)?.rolledAt
      const r = await fetch(`/api/mensagens?c=${encodeURIComponent(conv)}${ult ? `&since=${encodeURIComponent(ult)}` : ''}`).catch(() => null)
      const j = r?.ok ? await r.json().catch(() => null) as { mensagens?: Registro[]; escrevendo?: string[] } | null : null
      setEscrevendo(j?.escrevendo ?? [])
      const novos = (j?.mensagens ?? []).map(x => ({ ...x, fonte: 'msg' as const }))
      if (novos.length) setRegs(rs => { const ja = new Set((rs[conv] ?? []).map(x => x.id)); return { ...rs, [conv]: [...(rs[conv] ?? []), ...novos.filter(x => !ja.has(x.id))] } })
    }, 5000)
    return () => clearInterval(iv)
  }, [conv, regs])

  // Canal ao vivo: chat e rolagens da sessão (RollLog) a cada 4 s.
  useEffect(() => {
    if (!c?.aoVivo) return
    const iv = setInterval(async () => {
      const ult = (regs[c.id] ?? []).filter(x => x.fonte !== 'msg').at(-1)?.rolledAt
      const r = await fetch(`/api/campaigns/${c.id}/rolls${ult ? `?since=${encodeURIComponent(ult)}` : ''}`).catch(() => null)
      const body = r?.ok ? await r.json().catch(() => null) as { rolls?: (Registro & { oculto?: boolean })[] } | null : null
      // Rolagens privadas sem resultado para este leitor não entram no canal.
      const novos = (body?.rolls ?? []).filter(x => !x.oculto).map(x => ({ ...x, rolledAt: new Date(x.rolledAt).toISOString() })).reverse()
      if (novos.length) setRegs(rs => { const ja = new Set((rs[c.id] ?? []).map(x => x.id)); return { ...rs, [c.id]: [...(rs[c.id] ?? []), ...novos.filter(x => !ja.has(x.id))] } })
    }, 4000)
    return () => clearInterval(iv)
  }, [c?.id, c?.aoVivo, regs])

  // Erro ao enviar (SAGA Estados): sem rede ou falha do servidor, a mensagem fica aqui como "Não enviada".
  const [pend, setPend] = useState<Pend[]>([])
  const [offline, setOffline] = useState(false)
  useEffect(() => {
    const on = () => setOffline(false), off = () => setOffline(true)
    setOffline(typeof navigator !== 'undefined' && !navigator.onLine)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  const entregar = async (p: Pend) => {
    setPend(ps => ps.map(q => q.id === p.id ? { ...q, st: 'sending' } : q))
    // Sessão ao vivo e fora de personagem: vai para o chat da Mesa (RollLog). O resto fica no canal (Mensagem).
    const r = p.live
      ? await post(`/api/campaigns/${p.camp}/rolls`, { expression: 'chat', message: p.x })
      : await post('/api/mensagens', { conversa: p.camp, texto: p.x, personagem: p.ic, ...(p.para ? { para: p.para } : {}) })
    const reg = r?.ok ? await r.json().catch(() => null) as Registro | null : null
    if (!reg) {
      // Recusa do servidor com motivo: a mensagem sai da fila e o motivo aparece na linha de digitação.
      if (r && r.status < 500) { const e = await r.json().catch(() => null) as { error?: string } | null; setPend(ps => ps.filter(q => q.id !== p.id)); setErro(e?.error ?? 'Não foi possível concluir agora. Tente de novo.'); return }
      setPend(ps => ps.map(q => q.id === p.id ? { ...q, st: 'failed' } : q)); return
    }
    setPend(ps => ps.filter(q => q.id !== p.id))
    const novo: Registro = { ...reg, rolledAt: new Date(reg.rolledAt).toISOString(), ...(p.live ? {} : { fonte: 'msg' as const }) }
    setFresh(novo.id)
    setRegs(rs => ({ ...rs, [p.camp]: [...(rs[p.camp] ?? []).filter(x => x.id !== novo.id), novo] }))
  }

  const send = async () => {
    const txt = draft.trim(); if (!txt || !c) return
    const m = txt.match(/^\/r\s*(\d*d\d+\s*(?:[+-]\s*\d+)?)/i)
    setErro('')
    if (!m) {
      const ic = mode === 'ic' && !dm && !whisper ? personagem : null
      const para = whisper ? alvo!.id : null
      const p: Pend = { id: `p${Date.now()}`, camp: c.id, x: txt, ic, live: !dm && !!c.aoVivo && !ic && !para, para, st: 'sending' }
      setDraft(''); setPend(ps => [...ps, p]); setFresh(p.id)
      void entregar(p)
      return
    }
    if (dm) { setErro('Rolagens ficam no canal da campanha.'); return }
    const r = await post(`/api/campaigns/${c.id}/rolls`, { expression: m[1]!.replace(/\s/g, '') })
    const reg = r?.ok ? await r.json().catch(() => null) as Registro | null : null
    if (!reg) {
      const e = r ? await r.json().catch(() => null) as { error?: string } | null : null
      setErro(e?.error === 'Nenhuma sessão ativa' ? 'Rolagens no canal só com a sessão ao vivo.' : e?.error ?? 'Não foi possível concluir agora. Tente de novo.')
      return
    }
    const novo = { ...reg, rolledAt: new Date(reg.rolledAt).toISOString() }
    setDraft(''); setFresh(novo.id)
    setRollingId(novo.id); setTimeout(() => setRollingId(null), 800)
    setRegs(rs => ({ ...rs, [c.id]: [...(rs[c.id] ?? []), novo] }))
  }

  const hora = (iso: string) => (mounted ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '')
  const item = (x: Canal, i: number) => {
    const ult = (regs[x.id] ?? []).at(-1), u = x.id === conv ? 0 : unread[x.id] ?? 0
    return {
      go: () => { setConv(x.id); setErro('') }, n: x.n, i: x.n.replace(/^(A|O|Os|As) /, '').charAt(0).toUpperCase(),
      av: x.tipo === 'dm' ? cor(x.n) : AV[i % AV.length], radius: x.tipo === 'dm' ? '50%' : '8px',
      dot: x.aoVivo ? 'var(--ok)' : 'var(--line)', t: ult ? hora(ult.rolledAt) : '',
      last: ult ? (ult.expression === 'chat' ? `${ult.rolledBy === d.eu ? 'Você: ' : ''}${ult.attribute ?? ''}` : `${ult.rolledBy} rolou ${ult.total}`) : x.tipo === 'dm' ? 'Comece uma conversa' : 'Sem mensagens ainda',
      unread: u > 0, u, bg: x.id === conv ? 'var(--accent-t)' : 'transparent', fw: u > 0 ? 600 : 500,
    }
  }

  const msgs = lista.map(x => {
    const me = x.rolledBy === d.eu, gm = !!c && x.rolledBy === c.mestre, chat = x.expression === 'chat', emPers = chat && !!x.personagem
    // Sussurro: o mestre vê o cartão "para @x"; quem recebe vê o selo.
    const sussurro = chat && !!x.para, meuSussurro = sussurro && me, paraMim = sussurro && !me
    const fixado = !!recado && chat && !sussurro && recado.texto === x.attribute
    const rolls = Array.isArray(x.rolls) ? x.rolls as number[] : []
    return {
      justify: me ? 'flex-end' : 'flex-start', align: me ? 'flex-end' : 'flex-start', showAv: !me, i: x.rolledBy.charAt(0).toUpperCase(), av: cor(x.rolledBy),
      meta: me ? `Você · ${hora(x.rolledAt)}` : `${x.rolledBy}${gm ? ' · Mestre' : ''} · ${hora(x.rolledAt)}`,
      isText: chat && !emPers && !sussurro, isIc: emPers && !sussurro, isRoll: !chat, isWhisper: paraMim, isHandout: false,
      sealedGM: meuSussurro, to: x.para ?? '', state: x.aberto ? 'selo rompido' : 'ainda selado', x: x.attribute ?? '',
      canPin: isGM && chat && !sussurro && !!x.attribute, pinL: fixado ? 'Fixado' : 'Fixar', pinC: fixado ? 'var(--accent)' : 'var(--muted)', pinT: fixado ? 'Este é o recado fixado' : 'Fixar como recado',
      pin: () => { if (!c || !x.attribute) return; setRecados(r => ({ ...r, [c.id]: { texto: x.attribute!, em: new Date().toISOString() } })); setPinEditing(false); fixar(x.attribute) },
      text: chat ? x.attribute ?? '' : '', char: x.personagem ?? (me ? c?.personagem ?? 'Você' : x.rolledBy),
      radius: me ? '12px 12px 3px 12px' : '12px 12px 12px 3px', bg: me ? 'var(--accent)' : 'var(--surface)', fg: me ? '#fff8f0' : 'var(--ink)', ring: me ? 'transparent' : 'var(--line)',
      label: chat ? '' : `${x.rolledBy} · ${x.attribute ?? x.expression}`, detail: chat ? '' : `${x.expression} · [${rolls.join(', ')}]`, total: chat ? '' : String(x.total),
      totalColor: !chat && /^1d20/i.test(x.expression) && rolls[0] === 20 ? '#f3dc94' : '#f1e3c2', dieAnim: rollingId === x.id ? 'mensagens-spin .8s cubic-bezier(.2,.7,.3,1) both' : 'none',
      sealed: paraMim && !x.aberto, opened: paraMim && !!x.aberto, sealAnim: abrindo === x.id ? 'msgmestre-shakeA .4s both' : 'none',
      open: () => {
        if (!paraMim || x.aberto) return
        setAbrindo(x.id)
        setTimeout(() => { setAbrindo(null); setRegs(rs => ({ ...rs, [conv]: (rs[conv] ?? []).map(y => (y.id === x.id ? { ...y, aberto: true } : y)) })) }, 420)
        void fetch(`/api/mensagens/${x.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ abrir: true }) }).catch(() => null)
      },
      slot: '', anim: x.id === fresh ? 'mensagens-msgIn .35s cubic-bezier(.3,1.2,.5,1) both' : 'none',
      temStatus: false, failed: false, st: '', stIcon: Loader, stC: '', retry: () => {}, drop: () => {},
    }
  }).concat(pend.filter(p => p.camp === c?.id).map(p => {
    const f = p.st === 'failed'
    return {
      justify: 'flex-end', align: 'flex-end', showAv: false, i: '', av: '', meta: 'Você',
      isText: !p.ic && !p.para, isIc: !!p.ic, isRoll: false, isWhisper: false, isHandout: false, text: p.x, char: p.ic ?? '',
      sealedGM: !!p.para, to: c?.jogadores.find(j => j.id === p.para)?.u ?? '', state: 'enviando', x: p.x,
      canPin: false, pinL: '', pinC: '', pinT: '', pin: () => {},
      radius: '12px 12px 3px 12px', bg: f ? 'transparent' : 'var(--accent)', fg: f ? 'var(--ink)' : '#fff8f0', ring: f ? 'var(--blood)' : 'transparent',
      label: '', detail: '', total: '', totalColor: '', dieAnim: 'none', sealed: false, opened: false, sealAnim: 'none', open: () => {},
      slot: '', anim: p.id === fresh ? 'mensagens-msgIn .35s cubic-bezier(.3,1.2,.5,1) both' : 'none',
      temStatus: true, failed: f, st: f ? 'Não enviada' : 'Enviando…', stIcon: f ? CircleAlert : Loader, stC: f ? 'var(--blood)' : 'var(--muted)',
      retry: () => { void entregar(p) }, drop: () => setPend(ps => ps.filter(q => q.id !== p.id)),
    }
  }))

  const ic = mode === 'ic' && !dm
  const idx = Math.max(0, d.canais.findIndex(x => x.id === conv))
  return {
    $href: (link: string) => dcHref(link, { campaignId: c && !dm ? c.id : undefined }),
    $img: (id: string): string | null => (id === 'msg-handout-a' ? c?.handouts[0] ?? null : id === 'msg-handout-b' ? c?.handouts[1] ?? null : null),
    groups: [
      { l: 'Diretas', items: d.diretas.map(item) },
      { l: 'Campanhas', items: d.canais.map(item) },
    ],
    cur: c ? {
      n: c.n, i: c.n.replace(/^(A|O|Os|As) /, '').charAt(0).toUpperCase(), av: dm ? cor(c.n) : AV[idx % AV.length], radius: dm ? '50%' : '8px', slot: `msg-capa-${c.id}`, cover: COVERS[idx % COVERS.length],
      sub: dm ? 'Conversa direta · só vocês dois veem' : `Canal da campanha · ${c.membros} membros${c.souMestre ? ' · você é o mestre' : ''}`, camp: c.n, sys: c.sys,
      next: c.aoVivo ? `Ao vivo agora · ${c.aoVivo}` : c.proxima ?? '—', char: personagem, pin: '—', // TODO(api): recado fixado
    } : { n: '', i: '', av: AV[0], radius: '8px', slot: '', cover: COVERS[0], sub: '', camp: '', sys: '', next: '', char: '', pin: '' },
    msgs, listRef, inputRef, offline,
    typing: !!erro || escrevendo.length > 0,
    typingLabel: erro || (escrevendo.length === 1 ? `${escrevendo[0]} está escrevendo…` : escrevendo.length === 2 ? `${escrevendo[0]} e ${escrevendo[1]} estão escrevendo…` : escrevendo.length ? 'Várias pessoas estão escrevendo…' : ''),
    // Mestre: sussurro selado (SAGA Mensagens Mestre).
    isGM, whisper,
    gmModes: ([['mesa', 'Para a campanha', MessagesSquare], ['sussurro', 'Sussurro selado', Lock]] as const).map(([k, l, icon]) => ({ l, icon, go: () => setGmMode(k), bg: gmMode === k ? (k === 'sussurro' ? '#2a1a10' : 'var(--surface)') : 'transparent', color: gmMode === k ? (k === 'sussurro' ? '#e8c46a' : 'var(--ink)') : 'var(--muted)', sh: gmMode === k ? '0 1px 2px rgb(0 0 0/.12)' : 'none' })),
    tos: (c?.jogadores ?? []).map(j => ({ u: j.u, i: j.u.charAt(0).toUpperCase(), av: cor(j.u), on: alvo?.id === j.id, go: () => setTo(j.id), bg: alvo?.id === j.id ? 'var(--accent-t)' : 'var(--surface)', ring: alvo?.id === j.id ? 'var(--accent)' : 'var(--line)' })),
    // Recado fixado: a campanha toda vê; só o mestre edita.
    hasPin: !!recado, pinView: !pinEditing, pinEditing,
    pinText: recado?.texto ?? 'Nenhum recado fixado.', pinMeta: recado?.em && mounted ? `Fixado pelo Mestre · ${new Date(recado.em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}` : '',
    pinDraft, onPinDraft: (e: ChangeEvent<HTMLTextAreaElement>) => setPinDraft(e.target.value.slice(0, 600)), pinEditL: pinEditing ? 'Salvar recado' : 'Editar recado',
    pinEdit: () => {
      if (!c) return
      if (!pinEditing) { setPinDraft(recado?.texto ?? ''); setPinEditing(true); return }
      const t = pinDraft.trim(); setPinEditing(false)
      setRecados(r => ({ ...r, [c.id]: t ? { texto: t, em: new Date().toISOString() } : null })); fixar(t || null)
    },
    unpin: () => { if (!c) return; setRecados(r => ({ ...r, [c.id]: null })); setPinEditing(false); fixar(null) },
    // Em personagem só no canal da campanha.
    modes: (dm ? [['ooc', 'Mensagem direta']] as const : [['ooc', 'Fora de personagem'], ['ic', `Em personagem · ${personagem.split(' ')[0]}`]] as const).map(([k, l]) => ({
      l, go: () => setMode(k), bg: (dm ? 'ooc' : mode) === k ? 'var(--surface)' : 'transparent', color: (dm ? 'ooc' : mode) === k ? 'var(--ink)' : 'var(--muted)', sh: (dm ? 'ooc' : mode) === k ? '0 1px 2px rgb(0 0 0/.08)' : 'none',
    })),
    draft, onDraft: (e: ChangeEvent<HTMLInputElement>) => {
      setDraft(e.target.value); setErro('')
      if (conv && e.target.value && Date.now() - ultimoSinal.current > 3000) { ultimoSinal.current = Date.now(); void post('/api/mensagens/digitando', { conversa: conv }) }
    }, onKey: (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); void send() } },
    ph: c ? (whisper ? `Sussurro selado para @${alvo!.u}: só essa pessoa lê…` : ic ? `Fale como ${personagem}…` : `Mensagem para ${c.n}`) : 'Entre numa campanha para conversar com a mesa',
    inputFont: ic ? "italic 400 18px/1 'IM Fell English',serif" : "400 14px/1 'Geist',sans-serif",
    send: () => void send(), sendBg: whisper ? 'linear-gradient(180deg,#a8262f,#7a1820)' : draft.trim() ? 'var(--accent)' : 'var(--surface2)', sendColor: draft.trim() ? '#fff8f0' : 'var(--muted)',
    insertRoll: () => { if (dm) { setErro('Rolagens ficam no canal da campanha.'); return } setDraft('/r 1d20'); inputRef.current?.focus() },
    whisperInfo: (() => { const n = lista.filter(x => x.para).length; return n ? `${n} sussurro${n > 1 ? 's' : ''} nesta conversa · só quem mandou e quem recebeu veem.` : isGM ? 'Escolha "Sussurro selado" para falar com uma pessoa só.' : 'Nenhum sussurro nesta conversa.' })(),
  }
}

export type Vals = ReturnType<typeof useMensagensVals>
