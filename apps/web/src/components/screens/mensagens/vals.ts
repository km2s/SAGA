'use client'

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { dcHref } from '@/lib/dc-routes'

/**
 * Porte do renderVals() de SAGA Mensagens.dc.html sobre o canal da campanha
 * que existe hoje: o chat e as rolagens da sessão ativa (RollLog). Mensagens
 * diretas, sussurro selado, recado fixado e modo em personagem dependem da API.
 */
export type Registro = { id: string; rolledBy: string; expression: string; attribute: string | null; total: number; rolls: unknown; rolledAt: string }
export type MensagensDados = {
  eu: string
  canais: {
    id: string; n: string; sys: string; mestre: string; souMestre: boolean; membros: number; personagem: string | null
    aoVivo: string | null; registros: Registro[]; handouts: string[]
  }[]
  inicial: string | null
}

const AV = ['#8f3a24', '#6a2817', '#3a6a7a', '#b8492a', '#b98a2a', '#4f7a3a', '#6b5a8a']
const COVERS = ['linear-gradient(135deg,#2a1c08,#c9a22a)', 'linear-gradient(135deg,#0b0c11,#6a2817)', 'linear-gradient(135deg,#0e1a1c,#3a5a5a)']
const cor = (nome: string) => AV[[...nome].reduce((a, c) => a + c.charCodeAt(0), 0) % AV.length]

export function useMensagensVals(d: MensagensDados) {
  const [conv, setConv] = useState(d.inicial ?? d.canais[0]?.id ?? '')
  const [mode, setMode] = useState<'ooc' | 'ic'>('ooc')
  const [draft, setDraft] = useState('')
  const [regs, setRegs] = useState<Record<string, Registro[]>>(() => Object.fromEntries(d.canais.map(c => [c.id, c.registros])))
  const [fresh, setFresh] = useState<string | null>(null)
  const [rollingId, setRollingId] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [mounted, setMounted] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const c = d.canais.find(x => x.id === conv) ?? null
  const lista = regs[conv] ?? []

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { const el = listRef.current; if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight }) }, [conv, lista.length])

  // Canal ao vivo: busca o que chegou desde a última mensagem a cada 4 s.
  useEffect(() => {
    if (!c?.aoVivo) return
    const iv = setInterval(async () => {
      const ult = (regs[c.id] ?? []).at(-1)?.rolledAt
      const r = await fetch(`/api/campaigns/${c.id}/rolls${ult ? `?since=${encodeURIComponent(ult)}` : ''}`).catch(() => null)
      const body = r?.ok ? await r.json().catch(() => null) as { rolls?: (Registro & { oculto?: boolean })[] } | null : null
      // Rolagens privadas sem resultado para este leitor não entram no canal.
      const novos = (body?.rolls ?? []).filter(x => !x.oculto).map(x => ({ ...x, rolledAt: new Date(x.rolledAt).toISOString() })).reverse()
      if (novos.length) setRegs(rs => { const ja = new Set((rs[c.id] ?? []).map(x => x.id)); return { ...rs, [c.id]: [...(rs[c.id] ?? []), ...novos.filter(x => !ja.has(x.id))] } })
    }, 4000)
    return () => clearInterval(iv)
  }, [c?.id, c?.aoVivo, regs])

  const send = async () => {
    const txt = draft.trim(); if (!txt || !c) return
    const m = txt.match(/^\/r\s*(\d*d\d+\s*(?:[+-]\s*\d+)?)/i)
    const body = m ? { expression: m[1].replace(/\s/g, '') } : { expression: 'chat', message: txt } // TODO(api): marcar mensagem em personagem
    setErro('')
    const r = await fetch(`/api/campaigns/${c.id}/rolls`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null)
    const reg = r?.ok ? await r.json().catch(() => null) as Registro | null : null
    if (!reg) {
      const e = r ? await r.json().catch(() => null) as { error?: string } | null : null
      setErro(e?.error === 'Nenhuma sessão ativa' ? 'O canal abre para mensagens quando a sessão começa.' : e?.error ?? 'Não foi possível concluir agora. Tente de novo.')
      return
    }
    const novo = { ...reg, rolledAt: new Date(reg.rolledAt).toISOString() }
    setDraft(''); setFresh(novo.id)
    if (m) { setRollingId(novo.id); setTimeout(() => setRollingId(null), 800) }
    setRegs(rs => ({ ...rs, [c.id]: [...(rs[c.id] ?? []), novo] }))
  }

  const hora = (iso: string) => (mounted ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '')
  const item = (x: MensagensDados['canais'][number], i: number) => {
    const ult = (regs[x.id] ?? []).at(-1)
    return {
      go: () => { setConv(x.id); setErro('') }, n: x.n, i: x.n.replace(/^(A|O|Os|As) /, '').charAt(0).toUpperCase(), av: AV[i % AV.length], radius: '8px',
      dot: x.aoVivo ? 'var(--ok)' : 'var(--line)', t: ult ? hora(ult.rolledAt) : '',
      last: ult ? (ult.expression === 'chat' ? ult.attribute ?? '' : `${ult.rolledBy} rolou ${ult.total}`) : 'Sem mensagens ainda',
      unread: false, u: 0, bg: x.id === conv ? 'var(--accent-t)' : 'transparent', fw: 500,
    }
  }

  const msgs = lista.map(x => {
    const me = x.rolledBy === d.eu, gm = !!c && x.rolledBy === c.mestre, chat = x.expression === 'chat'
    const rolls = Array.isArray(x.rolls) ? x.rolls as number[] : []
    return {
      justify: me ? 'flex-end' : 'flex-start', align: me ? 'flex-end' : 'flex-start', showAv: !me, i: x.rolledBy.charAt(0).toUpperCase(), av: cor(x.rolledBy),
      meta: me ? `Você · ${hora(x.rolledAt)}` : `${x.rolledBy}${gm ? ' · Mestre' : ''} · ${hora(x.rolledAt)}`,
      isText: chat, isIc: false, isRoll: !chat, isWhisper: false, isHandout: false,
      text: chat ? x.attribute ?? '' : '', char: me ? c?.personagem ?? 'Você' : x.rolledBy,
      radius: me ? '12px 12px 3px 12px' : '12px 12px 12px 3px', bg: me ? 'var(--accent)' : 'var(--surface)', fg: me ? '#fff8f0' : 'var(--ink)', ring: me ? 'transparent' : 'var(--line)',
      label: chat ? '' : `${x.rolledBy} · ${x.attribute ?? x.expression}`, detail: chat ? '' : `${x.expression} · [${rolls.join(', ')}]`, total: chat ? '' : String(x.total),
      totalColor: !chat && /^1d20/i.test(x.expression) && rolls[0] === 20 ? '#f3dc94' : '#f1e3c2', dieAnim: rollingId === x.id ? 'mensagens-spin .8s cubic-bezier(.2,.7,.3,1) both' : 'none',
      sealed: false, opened: false, sealAnim: 'none', open: () => { /* TODO(api): sussurro selado */ },
      slot: '', anim: x.id === fresh ? 'mensagens-msgIn .35s cubic-bezier(.3,1.2,.5,1) both' : 'none',
    }
  })

  const ic = mode === 'ic'
  const personagem = c?.personagem ?? 'Mestre'
  const idx = d.canais.findIndex(x => x.id === conv)
  return {
    $href: (link: string) => dcHref(link, { campaignId: c?.id }),
    $img: (id: string): string | null => (id === 'msg-handout-a' ? c?.handouts[0] ?? null : id === 'msg-handout-b' ? c?.handouts[1] ?? null : null),
    groups: [
      { l: 'Diretas', items: [] as ReturnType<typeof item>[] }, // TODO(api): mensagens diretas
      { l: 'Campanhas', items: d.canais.map(item) },
    ],
    cur: c ? {
      n: c.n, i: c.n.replace(/^(A|O|Os|As) /, '').charAt(0).toUpperCase(), av: AV[idx % AV.length], radius: '8px', slot: `msg-capa-${c.id}`, cover: COVERS[idx % COVERS.length],
      sub: `Canal da campanha · ${c.membros} membros${c.souMestre ? ' · você é o mestre' : ''}`, camp: c.n, sys: c.sys,
      next: c.aoVivo ? `Ao vivo agora · ${c.aoVivo}` : '—', char: personagem, pin: '—', // TODO(api): recado fixado e próxima sessão
    } : { n: '', i: '', av: AV[0], radius: '8px', slot: '', cover: COVERS[0], sub: '', camp: '', sys: '', next: '', char: '', pin: '' },
    msgs, listRef, inputRef,
    typing: !!erro, typingLabel: erro,
    modes: ([['ooc', 'Fora de personagem'], ['ic', `Em personagem · ${personagem.split(' ')[0]}`]] as const).map(([k, l]) => ({
      l, go: () => setMode(k), bg: mode === k ? 'var(--surface)' : 'transparent', color: mode === k ? 'var(--ink)' : 'var(--muted)', sh: mode === k ? '0 1px 2px rgb(0 0 0/.08)' : 'none',
    })),
    draft, onDraft: (e: ChangeEvent<HTMLInputElement>) => { setDraft(e.target.value); setErro('') }, onKey: (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); void send() } },
    ph: c ? (ic ? `Fale como ${personagem}…` : `Mensagem para ${c.n}`) : 'Entre numa campanha para conversar com a mesa',
    inputFont: ic ? "italic 400 18px/1 'IM Fell English',serif" : "400 14px/1 'Geist',sans-serif",
    send: () => void send(), sendBg: draft.trim() ? 'var(--accent)' : 'var(--surface2)', sendColor: draft.trim() ? '#fff8f0' : 'var(--muted)',
    insertRoll: () => { setDraft('/r 1d20'); inputRef.current?.focus() },
    whisperInfo: 'Nenhum sussurro nesta conversa.',
  }
}

export type Vals = ReturnType<typeof useMensagensVals>
