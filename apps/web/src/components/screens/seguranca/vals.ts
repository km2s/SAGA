'use client'

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { Check, Copy, Monitor, Shield, ShieldCheck, Smartphone, TabletSmartphone, type LucideIcon } from 'lucide-react'
import { haQuanto } from '@/lib/tempo'

/** Dados reais de /perfil/seguranca (verificação em duas etapas e dispositivos). */
export type SegurancaDados = {
  ativo: boolean; desde: string | null
  dispositivos: { id: string; nome: string; local: string | null; vistoEm: string; atual: boolean }[]
}

const json = (url: string, method: string, body?: unknown) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).catch(() => null)
const resposta = async <T,>(r: Response | null) => (r ? await r.json().catch(() => null) as (T & { error?: string }) | null : null)
const icone = (nome: string): LucideIcon => (/iPhone|Android/.test(nome) ? Smartphone : /iPad/.test(nome) ? TabletSmartphone : Monitor)

export function useSegurancaVals(d: SegurancaDados) {
  const [tf, setTf] = useState<'off' | 'on' | 'setup'>(d.ativo ? 'on' : 'off')
  const [desde, setDesde] = useState(d.desde)
  const [step, setStep] = useState(1)
  const [chave, setChave] = useState('')
  const [qr, setQr] = useState<{ n: number; bits: string }>({ n: 21, bits: '' })
  const [code, setCode] = useState('')
  const [codeErr, setCodeErr] = useState('')
  const [shake, setShake] = useState(0)
  const [copied, setCopied] = useState(false)
  const [codes, setCodes] = useState<string[]>([])
  const [codesCopied, setCodesCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [offAsk, setOffAsk] = useState(false)
  const [offCode, setOffCode] = useState('')
  const [offErr, setOffErr] = useState('')
  const [devs, setDevs] = useState(d.dispositivos)
  const [allAsk, setAllAsk] = useState(false)
  const [agora, setAgora] = useState<number | null>(null)
  const ocupado = useRef(false)
  useEffect(() => { setAgora(Date.now()) }, [])

  const on = tf === 'on', flow = tf === 'setup'
  const erro = (msg: string) => { setCodeErr(msg); setShake(n => n + 1) }
  const verify = async () => {
    if (ocupado.current) return
    if (code.length < 6) { erro('O código tem 6 dígitos.'); return }
    ocupado.current = true
    const j = await resposta<{ codigos?: string[] }>(await json('/api/perfil/2fa', 'POST', { acao: 'confirmar', codigo: code }))
    ocupado.current = false
    if (!j?.codigos) { erro(j?.error ?? 'Não foi possível confirmar agora. Tente de novo.'); return }
    setCodes(j.codigos); setStep(3); setCodeErr(''); setSaved(false); setCodesCopied(false)
  }
  const copiar = (t: string) => { try { void navigator.clipboard?.writeText(t) } catch { /* sem clipboard */ } }
  const outras = devs.filter(x => !x.atual)

  return {
    tfOff: tf === 'off', tfOn: on, tfFlow: flow, tfIcon: on ? ShieldCheck : Shield,
    tfBg: on ? 'color-mix(in oklab, var(--ok) 14%, transparent)' : 'var(--surface2)', tfC: on ? 'var(--ok)' : 'var(--muted)',
    tfSub: on ? `Ativa${desde && agora ? ` desde ${new Date(desde).toLocaleDateString('pt-BR')}` : ''} · pede um código do app ao entrar pelo Discord.` : flow ? 'Configurando…' : 'Desativada. Além do Discord, peça um código do celular ao entrar.',
    tfStart: async () => {
      const j = await resposta<{ chave?: string; qr?: { n: number; bits: string } }>(await json('/api/perfil/2fa', 'POST', { acao: 'iniciar' }))
      if (!j?.chave || !j.qr) { erro(j?.error ?? 'Não foi possível começar agora.'); return }
      setChave(j.chave); setQr(j.qr); setTf('setup'); setStep(1); setCode(''); setCodeErr(''); setSaved(false); setCopied(false)
    },
    tfNewCodes: async () => {
      const j = await resposta<{ codigos?: string[] }>(await json('/api/perfil/2fa', 'POST', { acao: 'novos-codigos' }))
      if (!j?.codigos) return
      setCodes(j.codigos); setTf('setup'); setStep(3); setSaved(false); setCodesCopied(false)
    },
    tfAskOff: () => { setOffAsk(true); setOffCode(''); setOffErr('') },
    steps: ['Escanear', 'Confirmar', 'Recuperação'].map((l, i) => ({ l, n: step > i + 1 ? '✓' : i + 1, sep: i < 2 ? 'block' : 'none', bg: step > i + 1 ? 'var(--ok)' : step === i + 1 ? 'var(--accent)' : 'var(--surface2)', fg: step >= i + 1 ? '#fff8f0' : 'var(--muted)', color: step === i + 1 ? 'var(--ink)' : 'var(--muted)' })),
    st1: step === 1, st2: step === 2, st3: step === 3,
    qrN: qr.n, qr: Array.from(qr.bits, b => (b === '1' ? '#241c14' : 'transparent')),
    chave, copyKey: () => { copiar(chave.replace(/\s/g, '')); setCopied(true) }, copyL: copied ? 'Copiada' : 'Copiar', copyIcon: copied ? Check : Copy,
    go2: () => setStep(2), back1: () => setStep(1),
    code, onCode: (e: ChangeEvent<HTMLInputElement>) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setCodeErr('') },
    codeKey: (e: KeyboardEvent) => { if (e.key === 'Enter') void verify() }, verify: () => { void verify() },
    codeHint: 'O código muda a cada 30 segundos.',
    boxes: Array.from({ length: 6 }, (_, i) => ({ v: code[i] || '', ring: codeErr ? 'var(--blood)' : i === code.length ? 'var(--accent)' : 'var(--line)' })),
    codeErr, codeShake: shake ? `${shake % 2 ? 'seguranca-shakeA' : 'seguranca-shakeB'} .45s both` : 'none',
    codes,
    copyCodes: () => { copiar(codes.join('\n')); setCodesCopied(true) }, copyCodesL: codesCopied ? 'Copiados' : 'Copiar todos', copyCodesIcon: codesCopied ? Check : Copy,
    baixar: () => {
      const blob = new Blob([`SAGA · códigos de recuperação\nCada código vale uma vez.\n\n${codes.join('\n')}\n`], { type: 'text/plain;charset=utf-8' })
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'saga-codigos-de-recuperacao.txt'; a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    },
    saved, onSaved: () => setSaved(s => !s), finOp: saved ? 1 : 0.45,
    finish: () => { if (!saved) return; setTf('on'); setDesde(x => x ?? new Date().toISOString()); setCodes([]) },
    offAsk, offCode, onOffCode: (e: ChangeEvent<HTMLInputElement>) => { setOffCode(e.target.value.replace(/[^\dA-Za-z-]/g, '').slice(0, 9)); setOffErr('') }, offErr,
    doOff: async () => {
      const j = await resposta<{ ok?: boolean }>(await json('/api/perfil/2fa', 'POST', { acao: 'desativar', codigo: offCode }))
      if (!j?.ok) { setOffErr(j?.error ?? 'Código inválido.'); return }
      setTf('off'); setOffAsk(false); setDesde(null)
    },
    cancelOff: () => setOffAsk(false),
    devLine: `${devs.length} ${devs.length === 1 ? 'sessão ativa' : 'sessões ativas'}. Encerrar desconecta em até um minuto.`,
    hasOthers: outras.length > 0, allL: allAsk ? 'Confirmar: encerrar todas as outras' : 'Encerrar todas as outras',
    allAsk: async () => {
      if (!allAsk) { setAllAsk(true); return }
      const r = await json('/api/perfil/dispositivos', 'DELETE', { outras: true })
      if (r?.ok) setDevs(xs => xs.filter(x => x.atual))
      setAllAsk(false)
    },
    devs: devs.map(x => ({
      id: x.id, n: x.nome, icon: icone(x.nome), cur: x.atual, canEnd: !x.atual, anim: 'none',
      meta: `${x.local ?? 'Local desconhecido'} · ${x.atual ? 'ativo agora' : agora ? haQuanto(new Date(x.vistoEm), agora) : ''}`,
      end: async () => { const r = await json('/api/perfil/dispositivos', 'DELETE', { id: x.id }); if (r?.ok) setDevs(xs => xs.filter(y => y.id !== x.id)) },
    })),
  }
}

export type Vals = ReturnType<typeof useSegurancaVals>
