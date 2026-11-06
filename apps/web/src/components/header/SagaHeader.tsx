'use client'

import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Bot, ChevronDown, CircleQuestionMark, Compass, LogOut, MessagesSquare, Moon, Plus, Search, Sun, UserRound } from 'lucide-react'
import { DiscordIcon, Logo } from '@/components/ui/saga'
import { toggleTema } from '@/lib/tema'
import { TOUR_TOTAL, tourStore, useTour } from '@/lib/tour-store'
import s from './SagaHeader.module.css'

export type HeaderAtivo = 'inicio' | 'campanhas' | 'personagens' | 'explorar' | 'sistemas' | 'mensagens' | 'perfil'

/** Atalho de campanha no menu "Campanhas". */
export type HeaderCampanha = { id: string; nome: string; meta: string; mestre: boolean; aoVivo: boolean; capa: string | null }

const NAV: [HeaderAtivo, string, string][] = [
  ['inicio', 'Início', '/dashboard'],
  ['campanhas', 'Campanhas', '/campanhas'],
  ['personagens', 'Personagens', '/personagens'],
  ['explorar', 'Explorar', '/explorar'],
  ['sistemas', 'Sistemas', '/sistemas'],
]

// Fundo atrás da capa (o gradiente do design); a imagem da capa cobre por cima quando existir.
const COVERS = ['linear-gradient(150deg,#7a4a14,#2a1804)', 'linear-gradient(150deg,#1e4a4a,#081a1a)', 'linear-gradient(150deg,#5a1a2e,#1c080e)']

/** Rota → aba ativa do header. */
export function ativoFromPath(pathname: string): HeaderAtivo {
  const seg = pathname.split('/')[1]
  if (seg === 'campanhas' || seg === 'campaign' || seg === 'convite') return 'campanhas'
  if (seg === 'personagens' || seg === 'explorar' || seg === 'sistemas' || seg === 'mensagens' || seg === 'perfil') return seg
  return 'inicio'
}

// TODO(api): não há endpoint de mensagens ainda; o selo some com 0 não lidas.
export function SagaHeader({ ativo, campanhas, inviteUrl, unread = 0 }: { ativo: HeaderAtivo; campanhas: HeaderCampanha[]; inviteUrl: string | null; unread?: number }) {
  const { data: session } = useSession()
  const username = session?.user?.username ?? ''
  const nome = session?.user?.displayName || username
  const inicial = (nome || '?').charAt(0).toUpperCase()
  const [menu, setMenu] = useState<'camp' | 'me' | null>(null)
  const tour = useTour()

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null) }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [])

  const set = (k: 'camp' | 'me') => () => setMenu(m => (m === k ? null : k))
  const close = () => setMenu(null)
  // Mesmas regras do renderVals(): i > 2 some abaixo de 960px, i > 1 abaixo de 820px (exceto a ativa).
  const hideCls = (k: HeaderAtivo, i: number) => (ativo === k ? '' : i > 2 ? s.hide960 : i > 1 ? s.hide820 : '')
  const showCls = (k: HeaderAtivo, i: number) => (ativo === k ? null : i > 2 ? s.show960 : i > 1 ? s.show820 : null)

  return (
    <div data-s="" className={s.wrap}>
      <header className={s.header}>
        {menu && <button type="button" onClick={close} aria-label="Fechar menu" className={s.backdrop} />}
        <div className={s.inner}>
          <Link href="/dashboard" className={s.brand}><Logo /></Link>
          <nav className={s.nav}>
            {NAV.map(([k, label, href], i) => (
              <div key={k} className={`${s.navCell} ${hideCls(k, i)}`}>
                <Link href={href} className={`${s.navItem} ${ativo === k ? s.navOn : ''} ${k === 'campanhas' ? s.navDrop : ''}`}>{label}</Link>
                {k === 'campanhas' && (
                  <button type="button" onClick={set('camp')} aria-label="Atalhos das campanhas" aria-expanded={menu === 'camp'} className={`${s.chev} ${menu === 'camp' ? s.chevOpen : ''}`}>
                    <ChevronDown size={13} />
                  </button>
                )}
              </div>
            ))}
          </nav>
          <div className={s.spacer} />
          <label className={s.search}>
            <Search size={15} style={{ flex: 'none' }} />
            {/* Nas telas com paleta ⌘K (Início), focar a busca abre a paleta. */}
            <input placeholder="Buscar no Saga" onFocus={e => { if (!window.dispatchEvent(new CustomEvent('saga:abrir-paleta', { cancelable: true }))) e.currentTarget.blur() }} />
            <span className={s.kbd}>⌘K</span>
          </label>
          {tour?.phase === 'closed' && (
            <button type="button" onClick={() => tourStore.set(t => ({ ...t, phase: 'guide' }))} className={s.tourPill}>
              <span>❦</span>Primeiros passos<span className={s.tourProg}>{Object.keys(tour.done).length}/{TOUR_TOTAL}</span>
            </button>
          )}
          <Link href="/mensagens" title="Mensagens" className={`${s.iconBtn} ${ativo === 'mensagens' ? s.msgOn : ''}`}>
            <MessagesSquare size={16} />
            {unread > 0 && <span className={s.badge}>{unread}</span>}
          </Link>
          <button type="button" onClick={toggleTema} title="Alternar tema" aria-label="Alternar tema" className={s.iconBtn}>
            <Moon size={16} data-tema-icon="claro" />
            <Sun size={16} data-tema-icon="escuro" />
          </button>
          <button type="button" onClick={set('me')} title="Sua conta" aria-label="Abrir menu da conta" aria-expanded={menu === 'me'} className={`${s.avatar} ${ativo === 'perfil' || menu === 'me' ? s.avatarOn : ''}`}>{inicial}</button>
        </div>

        {menu === 'camp' && (
          <div className={`${s.pop} ${s.camp}`}>
            <p className={s.campTitle}>Suas crônicas</p>
            {campanhas.map((c, i) => (
              <Link key={c.id} href={c.mestre ? `/campaign/${c.id}` : `/campaign/${c.id}/mesa`} onClick={close} className={s.campRow}>
                <span className={s.campCover} style={{ background: c.capa ? `center/cover no-repeat url("${encodeURI(c.capa)}"), ${COVERS[i % COVERS.length]}` : COVERS[i % COVERS.length] }} />
                <span className={s.campText}>
                  <span className={s.campName}>{c.nome}</span>
                  <span className={s.campMeta}>{c.aoVivo && <span className={s.live} />}{c.meta}</span>
                </span>
                <span className={`${s.role} ${c.mestre ? s.roleGm : ''}`}>{c.mestre ? 'Mestre' : 'Jogador'}</span>
              </Link>
            ))}
            <div className={s.campFoot}>
              <Link href="/campanhas" onClick={close} className={s.campAll}>Ver todas</Link>
              <Link href="/campanhas/nova" onClick={close} className={s.campNew}><Plus size={13} />Nova campanha</Link>
            </div>
          </div>
        )}

        {menu === 'me' && (
          <div role="menu" className={`${s.pop} ${s.me}`}>
            <div className={s.meHead}>
              <span className={s.meAv}>{inicial}</span>
              <div className={s.meInfo}>
                <p className={s.meName}>{nome}</p>
                <p className={s.meHandle}><DiscordIcon size={12} />@{username} · Discord</p>
              </div>
            </div>
            <div className={s.meBody}>
              {NAV.map(([k, label, href], i) => {
                const show = showCls(k, i)
                return show && <Link key={k} href={href} role="menuitem" onClick={close} className={`${s.meNav} ${show}`}>{label}</Link>
              })}
              <Link href="/perfil" role="menuitem" onClick={close} className={s.meItem}><UserRound size={15} /><span className={s.meLabel}>Meu perfil</span><span className={s.meHint} /></Link>
              <Link href="/dashboard?tour=1" role="menuitem" onClick={close} className={s.meItem}><Compass size={15} /><span className={s.meLabel}>Primeiros Passos</span><span className={s.meHint}>tutorial</span></Link>
              <Link href="/dashboard?tour=1" role="menuitem" onClick={close} className={s.meItem}><CircleQuestionMark size={15} /><span className={s.meLabel}>Ajuda e atalhos</span><span className={s.meHint}>?</span></Link>
              {inviteUrl && (
                <a href={inviteUrl} target="_blank" rel="noopener noreferrer" role="menuitem" onClick={close} className={s.meItem}><Bot size={15} className={s.botIc} /><span className={s.meLabel}>Convidar bot do Discord</span><span className={s.meHint}>abre o Discord</span></a>
              )}
              <button type="button" onClick={toggleTema} role="menuitem" className={s.meItem}>
                <Moon size={15} data-tema-icon="claro" /><Sun size={15} data-tema-icon="escuro" />
                <span className={s.meLabel} data-tema-icon="claro">Modo cripta</span>
                <span className={s.meLabel} data-tema-icon="escuro">Modo pergaminho</span>
              </button>
            </div>
            <div className={s.meFoot}>
              <button type="button" role="menuitem" onClick={() => signOut({ callbackUrl: '/login' })} className={`${s.meItem} ${s.out}`}><LogOut size={15} />Sair da conta</button>
            </div>
          </div>
        )}
      </header>
    </div>
  )
}
