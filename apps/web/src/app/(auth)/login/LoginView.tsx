'use client'

import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { ArrowLeft, ArrowRight, Bird, Eye, EyeOff, Moon, Sun } from 'lucide-react'
import { DiscordIcon, GoogleIcon, Logo, WaxSeal } from '@/components/ui/saga'
import { toggleTema } from '@/lib/tema'
import { isUsernameAvailable, sendPasswordReset, signInEmail, signInGoogle, signUpEmail, type AuthResult } from '@/lib/auth-client'
import s from './Login.module.css'

export type LoginMode = 'login' | 'cadastro' | 'recuperar'

const SC = ['var(--line)', 'var(--accent)', 'var(--gold)', '#7a8a3a', 'var(--ok)']
const STR_LABEL = ['Muito fraca', 'Fraca', 'Razoável', 'Forte', 'Excelente']

// O middleware manda a URL absoluta da página pedida; só aceita a mesma origem (sem open redirect).
function sameOrigin(url?: string): string | undefined {
  if (!url || typeof window === 'undefined') return undefined
  try {
    const u = new URL(url, window.location.origin)
    return u.origin === window.location.origin ? u.pathname + u.search + u.hash : undefined
  } catch {
    return undefined
  }
}

/** Porte de Saga NOVO/SAGA Login.dc.html. */
export function LoginView({ initialMode, callbackUrl }: { initialMode: LoginMode; callbackUrl?: string }) {
  const [mode, setMode] = useState<LoginMode>(initialMode)
  const [tx, setTx] = useState(0)
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [user, setUser] = useState('')
  const [cEmail, setCEmail] = useState('')
  const [cPass, setCPass] = useState('')
  const [terms, setTerms] = useState(false)
  const [rEmail, setREmail] = useState('')
  const [rSent, setRSent] = useState(false)
  const [rBusy, setRBusy] = useState(false)
  const [err, setErr] = useState('')
  const [shake, setShake] = useState(0)
  const [sealed, setSealed] = useState<{ title: string; sub: string } | null>(null)
  const t1 = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => clearTimeout(t1.current), [])

  // Disponibilidade do nome de aventureiro, com debounce.
  const [avail, setAvail] = useState<{ u: string; ok: boolean | null } | null>(null)
  useEffect(() => {
    const q = user.trim().toLowerCase()
    if (q.length < 3) return
    const ctl = new AbortController()
    const t = setTimeout(() => {
      isUsernameAvailable(q, ctl.signal).then(ok => setAvail({ u: q, ok }))
    }, 350)
    return () => { clearTimeout(t); ctl.abort() }
  }, [user])

  const cad = mode === 'cadastro'
  // Cadastro abre o tour de primeiros passos; login volta para onde o middleware mandou.
  const next = cad ? '/dashboard?tour=1' : sameOrigin(callbackUrl) ?? '/dashboard'

  const fail = (e: string) => { setErr(e); setShake(n => n + 1) }
  const go = (m: LoginMode) => { setMode(m); setErr('') }
  const seal = (title: string, sub: string, then: () => void) => {
    setSealed({ title, sub }); setErr('')
    t1.current = setTimeout(then, 1900)
  }
  const sealAndGo = (title: string, sub: string) => seal(title, sub, () => { window.location.href = next })
  const handle = (r: AuthResult, title: string, sub: string) => (r.ok ? sealAndGo(title, sub) : fail(r.error))

  // Força da senha — mesmas 4 regras do design.
  const p = cPass
  let sc = 0
  if (p.length >= 8) sc++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) sc++
  if (/[0-9]/.test(p)) sc++
  if (/[^A-Za-z0-9]/.test(p) || p.length >= 14) sc++
  if (!p) sc = 0

  const u = user.trim().toLowerCase()
  const taken = avail?.u === u && avail.ok === false
  // Enquanto a checagem não volta (ou falha), não afirma nada — o servidor valida no cadastro.
  const known = avail?.u === u && avail.ok !== null
  const userMsg = !u ? '' : u.length < 3 ? 'mínimo 3 letras' : !known ? '' : taken ? 'já em uso' : 'disponível ✓'
  const userColor = !u || u.length < 3 ? 'var(--muted)' : taken ? 'var(--accent)' : 'var(--ok)'

  const login = async () => {
    if (!email.includes('@')) return fail('Informe um e-mail válido.')
    if (!pass) return fail('Falta a senha.')
    handle(await signInEmail(email, pass, remember), 'Bem-vindo de volta', 'Abrindo o seu salão…')
  }
  const onEnter = (e: KeyboardEvent) => { if (e.key === 'Enter') login() }

  const viaDiscord = () => seal('Conectando ao Discord', 'Seu nome e avatar virão de lá.', () => signIn('discord', { callbackUrl: next }))
  const viaGoogle = () => seal('Conectando ao Google', 'Só um instante…', () => signInGoogle(next))

  const sendRec = async () => {
    if (rBusy) return
    if (!rEmail.includes('@')) return fail('Informe um e-mail válido.')
    setRBusy(true)
    const r = await sendPasswordReset(rEmail)
    setRBusy(false)
    if (r.ok) setRSent(true)
    else fail(r.error)
  }

  const submitCad = async () => {
    if (u.length < 3 || taken) return fail('Escolha um nome de aventureiro disponível.')
    if (!cEmail.includes('@')) return fail('Informe um e-mail válido.')
    if (p.length < 8) return fail('A senha precisa de pelo menos 8 caracteres.')
    if (!terms) return fail('Aceite os termos para continuar.')
    handle(await signUpEmail(u, cEmail, p), 'Conta criada', `Bem-vindo ao Saga, @${u}.`)
  }

  const onMove = (e: MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setTx((e.clientX - r.left) / r.width - 0.5)
  }

  const shakeCls = shake ? (shake % 2 ? s.shakeA : s.shakeB) : ''
  const passType = show ? 'text' : 'password'
  const EyeIcon = show ? EyeOff : Eye
  const errP = err ? <p className={s.err}>{err}</p> : null
  const eyeBtn = <button type="button" onClick={() => setShow(!show)} aria-label="Mostrar senha" className={s.eye}><EyeIcon size={16} /></button>

  return (
    <div data-s="" className={s.root}>
      <section onMouseMove={onMove} onMouseLeave={() => setTx(0)} className={s.scene}>
        <svg viewBox="0 0 800 900" preserveAspectRatio="xMidYMax slice" className={s.sceneSvg} aria-hidden="true">
          <g className={s.sun} style={{ transform: `translateY(${cad ? 360 : 560}px)` }}>
            <circle cx="560" cy="0" r="150" fill="var(--glow)" className={s.sunGlow} />
            <circle cx="560" cy="0" r="54" fill="var(--sun)" />
          </g>
          <g className={s.cloud1}><ellipse cx="0" cy="190" rx="90" ry="14" fill="var(--cloud)" /><ellipse cx="40" cy="178" rx="54" ry="14" fill="var(--cloud)" /></g>
          <g className={s.cloud2}><ellipse cx="0" cy="300" rx="120" ry="12" fill="var(--cloud)" /><ellipse cx="-40" cy="290" rx="60" ry="12" fill="var(--cloud)" /></g>
          <g className={s.birds}>
            <path d="M0 0 q6 -6 12 0 q6 -6 12 0" stroke="var(--bird)" strokeWidth="2" fill="none" strokeLinecap="round" className={`${s.bird} ${s.flap1}`} />
            <path d="M30 14 q5 -5 10 0 q5 -5 10 0" stroke="var(--bird)" strokeWidth="1.8" fill="none" strokeLinecap="round" className={`${s.bird} ${s.flap2}`} />
            <path d="M-18 20 q4 -4 8 0 q4 -4 8 0" stroke="var(--bird)" strokeWidth="1.6" fill="none" strokeLinecap="round" className={`${s.bird} ${s.flap3}`} />
          </g>

          <g className={s.layer} style={{ transform: `translate(${(tx * -8).toFixed(1)}px,0)` }}>
            <path d="M-60 900 V640 Q60 590 170 616 T380 600 T600 612 T860 590 V900 Z" fill="var(--far)" className={s.fillT} />
            <g fill="var(--far)" className={s.farTowers}>
              <rect x="604" y="530" width="12" height="82" /><rect x="622" y="506" width="18" height="106" /><rect x="646" y="540" width="11" height="72" />
              <path d="M602 530 l8 -20 l8 20 Z M620 506 l11 -28 l11 28 Z M644 540 l7 -16 l7 16 Z" />
            </g>
          </g>

          <g className={s.layer} style={{ transform: `translate(${(tx * -18).toFixed(1)}px,0)` }}>
            <path d="M-60 900 V700 Q120 660 300 690 T620 676 T860 690 V900 Z" fill="var(--mid)" className={s.fillT} />
            <g fill="var(--castle)" className={s.fillT}>
              <rect x="430" y="560" width="210" height="140" />
              <path d="M430 560 h14 v-12 h14 v12 h14 v-12 h14 v12 h14 v-12 h14 v12 h14 v-12 h14 v12 h14 v-12 h14 v12 h14 v-12 h14 v12 h14 v-12 h14 v12 h12 v8 h-210 Z" />
              <rect x="414" y="500" width="40" height="200" /><rect x="616" y="510" width="40" height="190" />
              <path d="M410 500 l24 -46 l24 46 Z M612 510 l24 -42 l24 42 Z" />
              <rect x="508" y="440" width="56" height="140" />
              <path d="M502 440 l34 -70 l34 70 Z" />
              <rect x="535" y="340" width="2" height="32" />
              <path d="M520 700 v-52 q16 -22 32 0 v52 Z" fill="var(--near)" opacity=".55" />
            </g>
            <g className={s.flagG} style={{ transform: `translateY(${cad ? 0 : 26}px)` }}>
              <path d="M537 344 L568 352 L537 360 Z" fill="var(--accent)" className={s.flag} />
            </g>
            <g fill="var(--lit)" className={s.lit} style={{ opacity: cad ? 0.25 : 1 }}>
              <rect x="530" y="470" width="8" height="14" rx="4" className={s.fl1} />
              <rect x="430" y="540" width="6" height="11" rx="3" className={s.fl2} />
              <rect x="632" y="548" width="6" height="11" rx="3" className={s.fl3} />
              <rect x="470" y="610" width="6" height="10" rx="3" className={s.fl4} />
              <rect x="590" y="610" width="6" height="10" rx="3" className={s.fl5} />
            </g>
          </g>

          <g className={s.layer} style={{ transform: `translate(${(tx * -34).toFixed(1)}px,0)` }}>
            <path d="M-60 900 V770 Q90 742 220 760 Q340 776 430 754 Q560 724 700 750 Q790 766 860 752 V900 Z" fill="var(--near)" className={s.fillT} />
            <g fill="var(--near)">
              <path d="M70 772 l16 -54 l16 54 Z M96 776 l12 -40 l12 40 Z M716 756 l18 -60 l18 60 Z M744 760 l12 -42 l12 42 Z" />
            </g>
            <path d="M-60 900 V842 Q200 820 420 838 T860 830 V900 Z" fill="var(--ground)" className={s.fillT} />
            <path d="M300 900 Q340 860 420 846 Q470 838 520 842" stroke="var(--lit)" strokeOpacity=".28" strokeWidth="2" fill="none" strokeDasharray="4 8" />
          </g>
        </svg>

        <Link href="/" className={s.sceneLogo}><Logo seal={34} die={18} word={30} /></Link>

        <div className={s.caption}>
          <p className={s.captionKick}>{cad ? 'Alvorada' : 'Entardecer'}</p>
          <p className={s.captionLine}>
            {cad ? 'Uma nova crônica começa ao primeiro raio de sol.' : 'As luzes do castelo já estão acesas. Sua mesa espera.'}
          </p>
        </div>
      </section>

      <section className={s.side}>
        <div className={s.topRow}>
          <Link href="/" className={s.back}><ArrowLeft size={14} />Voltar ao início</Link>
          <button type="button" onClick={toggleTema} title="Alternar tema" aria-label="Alternar tema" className={s.iconBtn}>
            <Moon size={16} data-tema-icon="claro" />
            <Sun size={16} data-tema-icon="escuro" />
          </button>
        </div>

        <div className={s.center}>
          <div className={`${s.box} ${shakeCls}`}>
            <div className={s.tabs}>
              <span className={s.thumb} style={{ transform: `translateX(${cad ? '100%' : '0%'})` }} />
              <button type="button" onClick={() => go('login')} className={`${s.tab} ${cad ? '' : s.tabOn}`}>Entrar</button>
              <button type="button" onClick={() => go('cadastro')} className={`${s.tab} ${cad ? s.tabOn : ''}`}>Criar conta</button>
            </div>

            {mode === 'login' && (
              <div className={s.panel}>
                <h1 className={s.h1}>Bem-vindo de volta</h1>
                <p className={s.sub}>Suas campanhas estão onde você as deixou.</p>
                <div className={s.oauthCol}>
                  <button type="button" onClick={viaDiscord} className={`${s.oauth} ${s.discord} ${s.discordShadow}`}><DiscordIcon size={20} />Continuar com Discord</button>
                  <button type="button" onClick={viaGoogle} className={`${s.oauth} ${s.google}`}><GoogleIcon size={17} />Continuar com Google</button>
                </div>
                <div className={s.divider}><span />ou com sua conta Saga<span /></div>
                <label className={s.label}><span className={s.labelText}>E-mail</span>
                  <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErr('') }} onKeyDown={onEnter} placeholder="voce@exemplo.com" className={`${s.input} ${s.inputGap}`} />
                </label>
                <label className={`${s.label} ${s.mt14}`}>
                  <span className={s.labelRow}>Senha<button type="button" onClick={() => { setMode('recuperar'); setErr(''); setRSent(false); setREmail(email) }} className={s.linkBtn}>Esqueci a senha</button></span>
                  <span className={s.fieldWrap}>
                    <input type={passType} value={pass} onChange={e => { setPass(e.target.value); setErr('') }} onKeyDown={onEnter} placeholder="••••••••" className={`${s.input} ${s.inputPass}`} />
                    {eyeBtn}
                  </span>
                </label>
                <label className={s.check}><input type="checkbox" checked={remember} onChange={() => setRemember(!remember)} />Manter conectado neste dispositivo</label>
                {errP}
                <button type="button" onClick={login} className={s.submit}>Entrar<ArrowRight size={16} /></button>
              </div>
            )}

            {mode === 'recuperar' && (
              <div className={s.panel}>
                <h1 className={s.h1}>Recuperar a senha</h1>
                {!rSent && (
                  <>
                    <p className={`${s.sub} ${s.pretty}`}>Informe o e-mail da conta. Enviaremos um link para criar uma nova senha.</p>
                    <label className={`${s.label} ${s.mt22}`}><span className={s.labelText}>E-mail</span>
                      <input type="email" value={rEmail} onChange={e => { setREmail(e.target.value); setErr('') }} placeholder="voce@exemplo.com" className={`${s.input} ${s.inputGap}`} />
                    </label>
                    {errP}
                    <button type="button" onClick={sendRec} className={`${s.submit} ${s.submitFlat}`}>{rBusy && <span className={s.spinner} />}{rBusy ? 'Enviando…' : 'Enviar link'}</button>
                  </>
                )}
                {rSent && (
                  <>
                    <div className={s.sent}>
                      <span className={s.raven}><Bird size={22} /></span>
                      <p className={s.sentText}>Um corvo partiu para <span style={{ fontWeight: 600 }}>{rEmail}</span>. O link vale por 30 minutos — confira também o spam.</p>
                    </div>
                    <button type="button" onClick={() => setRSent(false)} className={s.resend}>Não chegou? Enviar de novo</button>
                  </>
                )}
                <button type="button" onClick={() => go('login')} className={s.backLogin}><ArrowLeft size={14} />Voltar para entrar</button>
              </div>
            )}

            {cad && (
              <div className={s.panel}>
                <h1 className={s.h1}>Comece sua saga</h1>
                <p className={s.sub}>Grátis. Leva menos de um minuto.</p>
                <div className={s.oauthGrid}>
                  <button type="button" onClick={viaDiscord} className={`${s.oauth} ${s.discord}`}><DiscordIcon size={19} />Discord</button>
                  <button type="button" onClick={viaGoogle} className={`${s.oauth} ${s.google}`}><GoogleIcon size={16} />Google</button>
                </div>
                <div className={s.divider}><span />ou com e-mail<span /></div>
                <label className={s.label}>
                  <span className={s.labelRow}>Nome de aventureiro<span style={{ color: userColor }}>{userMsg}</span></span>
                  <span className={s.fieldWrap}>
                    <span className={s.at}>@</span>
                    <input value={user} onChange={e => { setUser(e.target.value.replace(/\s/g, '_')); setErr('') }} placeholder="kael_o_mestre" className={`${s.input} ${s.inputUser}`} />
                  </span>
                </label>
                <label className={`${s.label} ${s.mt14}`}><span className={s.labelText}>E-mail</span>
                  <input type="email" value={cEmail} onChange={e => { setCEmail(e.target.value); setErr('') }} placeholder="voce@exemplo.com" className={`${s.input} ${s.inputGap}`} />
                </label>
                <label className={`${s.label} ${s.mt14}`}><span className={s.labelText}>Senha</span>
                  <span className={s.fieldWrap}>
                    <input type={passType} value={cPass} onChange={e => { setCPass(e.target.value); setErr('') }} placeholder="mínimo 8 caracteres" className={`${s.input} ${s.inputPass}`} />
                    {eyeBtn}
                  </span>
                </label>
                <div className={s.strengthRow}>
                  <div className={s.bars}>{[1, 2, 3, 4].map(i => <span key={i} style={{ background: i <= sc ? SC[sc] : 'var(--line)' }} />)}</div>
                  <span className={s.strLabel} style={{ color: sc ? SC[sc] : 'var(--muted)' }}>{p ? STR_LABEL[sc] : ''}</span>
                </div>
                <label className={`${s.check} ${s.checkTop}`}><input type="checkbox" checked={terms} onChange={() => { setTerms(!terms); setErr('') }} />Li e aceito os <a href="/termos">Termos</a> e a <a href="/privacidade">Política de Privacidade</a>.</label>
                {errP}
                <button type="button" onClick={submitCad} className={s.submit}>Criar conta</button>
              </div>
            )}

            {sealed && (
              <div className={s.sealed}>
                <WaxSeal size={104} letter="S" />
                <p className={s.sealTitle}>{sealed.title}</p>
                <p className={s.sealSub}>{sealed.sub}</p>
              </div>
            )}
          </div>
        </div>

        <p className={s.foot}>Ao entrar com Discord, seu nome e avatar podem ser sincronizados no perfil.</p>
      </section>
    </div>
  )
}
