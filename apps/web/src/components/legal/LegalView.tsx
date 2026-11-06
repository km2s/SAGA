'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, Moon, ScrollText, ShieldCheck, Sun } from 'lucide-react'
import { Logo } from '@/components/ui/saga'
import { LEGAL_DOCS, LEGAL_META, type LegalDoc } from '@/lib/legal'
import { toggleTema } from '@/lib/tema'
import s from './Legal.module.css'

const ICON = { termos: ScrollText, privacidade: ShieldCheck }

/** Porte de SAGA Termos e Privacidade.dc.html. A aba acompanha a rota (/termos, /privacidade). */
export function LegalView({ doc }: { doc: LegalDoc }) {
  const [tab, setTab] = useState<LegalDoc>(doc)
  const [sec, setSec] = useState<number | null>(null)
  const D = LEGAL_DOCS[tab]
  const otherK: LegalDoc = tab === 'termos' ? 'privacidade' : 'termos'

  const go = (k: LegalDoc) => {
    setTab(k); setSec(null)
    window.history.replaceState(null, '', `/${k}`)
    window.scrollTo({ top: 0 })
  }
  const goSec = (i: number) => {
    setSec(i)
    document.getElementById(`sec-${i}`)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div data-s="" className="saga-page" style={{ minHeight: '100vh' }}>
      <header className={s.top}>
        <div className={s.topIn}>
          <Link href="/" className={s.brand}><Logo /></Link>
          <div className={s.spacer} />
          <button type="button" onClick={toggleTema} aria-label="Alternar tema" className={s.iconBtn}>
            <Moon size={16} data-tema-icon="claro" />
            <Sun size={16} data-tema-icon="escuro" />
          </button>
          <Link href="/login" className={s.enter}>Entrar</Link>
        </div>
      </header>

      <main className={s.main}>
        <div className={s.intro}>
          <p className={s.kicker}><span>❦</span>Os pergaminhos da casa</p>
          <h1 className={s.h1}>{D.t}</h1>
          <p className={s.vig}>Em vigor desde <span className={s.mono}>{LEGAL_META.vigencia ?? '[DATA DE VIGÊNCIA]'}</span> · Versão <span className={s.mono}>{LEGAL_META.versao ?? '[1.0]'}</span></p>
        </div>

        <div role="tablist" className={s.tabs}>
          {(Object.keys(LEGAL_DOCS) as LegalDoc[]).map(k => {
            const Icon = ICON[k]
            return (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => go(k)} className={`${s.tab} ${tab === k ? s.tabOn : ''}`}>
                <Icon size={15} />{LEGAL_DOCS[k].t}
              </button>
            )
          })}
        </div>

        <div className={s.cols}>
          <nav aria-label="Sumário" className={`${s.card} ${s.toc}`}>
            <p className={s.tocTitle}>Sumário</p>
            {D.secs.map((x, i) => (
              <button key={x.t} type="button" onClick={() => goSec(i)} className={`${s.tocItem} ${sec === i ? s.tocOn : ''}`}>
                <span className={s.tocNum}>{String(i + 1).padStart(2, '0')}</span><span className={s.tocText}>{x.t}</span>
              </button>
            ))}
          </nav>

          <article key={tab} className={`${s.card} ${s.article}`}>
            <p className={s.lead}><span className={s.cap}>{D.cap}</span>{D.lead}</p>
            <div className={s.clear} />
            {D.secs.map((x, i) => (
              <section key={x.t} id={`sec-${i}`} className={`${s.sec} ${sec === i ? s.secOn : ''}`}>
                <h2 className={s.h2}><span>{String(i + 1).padStart(2, '0')}</span>{x.t}</h2>
                <p className={s.cover}>{x.cover}</p>
                {x.texto
                  ? x.texto.map((p, j) => <p key={j} className={s.body}>{p}</p>)
                  : <div className={s.placeholder}>[TEXTO JURÍDICO DESTA SEÇÃO — a ser fornecido pela Karine]</div>}
              </section>
            ))}
            <div className={s.foot}>
              <span className={s.seal}>S</span>
              <div className={s.footText}>
                <p className={s.footQ}>Dúvidas sobre este documento?</p>
                <p className={s.footA}>Escreva para <span className={s.mail}>{LEGAL_META.contato ?? '[E-MAIL DE CONTATO]'}</span></p>
              </div>
              <button type="button" onClick={() => go(otherK)} className={s.other}>Ler {LEGAL_DOCS[otherK].t}<ArrowRight size={14} /></button>
            </div>
          </article>
        </div>
      </main>
    </div>
  )
}
