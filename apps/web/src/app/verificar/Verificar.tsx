'use client'

import { useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Codigo } from '@/components/screens/seguranca/Codigo'

/**
 * Segundo passo do login com verificação em duas etapas. O passo é o mesmo da
 * SAGA Segurança ("Digite o código"); certo o código, o login do Discord volta e
 * desta vez cria a sessão.
 */
export function Verificar({ bilhete }: { bilhete: string }) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [codeErr, setCodeErr] = useState(bilhete ? '' : 'O tempo para confirmar acabou. Entre de novo pelo Discord.')
  const [shake, setShake] = useState(0)
  const [busy, setBusy] = useState(false)
  // Código de recuperação (XXXX-XXXX) também vale.
  const [recup, setRecup] = useState(false)

  const verify = async () => {
    if (busy) return
    const limpo = code.replace(/[^A-Za-z0-9]/g, '')
    if (!recup && limpo.length < 6) { setCodeErr('O código tem 6 dígitos.'); setShake(n => n + 1); return }
    setBusy(true)
    const r = await fetch('/api/verificar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: bilhete, codigo: code }) }).catch(() => null)
    const j = r ? await r.json().catch(() => null) as { ok?: boolean; error?: string } | null : null
    if (!j?.ok) { setBusy(false); setCodeErr(j?.error ?? 'Não foi possível confirmar agora. Tente de novo.'); setShake(n => n + 1); return }
    void signIn('discord', { callbackUrl: '/dashboard' })
  }
  const v = {
    codeShake: shake ? `${shake % 2 ? 'seguranca-shakeA' : 'seguranca-shakeB'} .45s both` : 'none',
    codeHint: recup ? 'Use um dos códigos de recuperação (cada um vale uma vez).' : busy ? 'Entrando…' : 'Abra o app autenticador e digite o código da SAGA.',
    boxes: Array.from({ length: 6 }, (_, i) => ({ v: recup ? '' : code[i] || '', ring: codeErr ? 'var(--blood)' : i === code.length ? 'var(--accent)' : 'var(--line)' })),
    code, codeErr,
    onCode: (e: ChangeEvent<HTMLInputElement>) => { setCode(recup ? e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 9) : e.target.value.replace(/\D/g, '').slice(0, 6)); setCodeErr('') },
    codeKey: (e: KeyboardEvent) => { if (e.key === 'Enter') void verify() },
    back1: () => router.push('/login'), verify: () => { void verify() },
  }
  return (
    <div data-s="" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px 16px', background: 'var(--bg)', color: 'var(--ink)', font: "400 14px/1.45 'Geist',system-ui,sans-serif" }}>
      <section style={{ width: '100%', maxWidth: '460px', padding: '24px 22px', borderRadius: '5px', background: 'linear-gradient(180deg, var(--surface), color-mix(in oklab, var(--surface) 60%, var(--surface2)))', border: '1px solid var(--line)' }}>
        <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', font: "400 16px/1 'IM Fell English SC',serif", color: 'var(--accent)' }}><span style={{ color: 'var(--gold)' }}>❦</span>Entrar</p>
        <h1 style={{ margin: '8px 0 14px', font: "400 30px/1.05 'IM Fell English',serif" }}>Verificação em duas etapas</h1>
        <Codigo v={v} />
        <button onClick={() => { setRecup(r => !r); setCode(''); setCodeErr('') }} style={{ all: 'unset', cursor: 'pointer', marginTop: '14px', fontSize: '13px', color: 'var(--accent)' }}>
          {recup ? 'Usar o código do app' : 'Perdi o celular: usar um código de recuperação'}
        </button>
      </section>
    </div>
  )
}
