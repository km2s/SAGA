'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Castle, Check, Copy, Cpu, Dices, Eye, Feather, Headphones, Map as MapIcon, Moon, Swords, type LucideIcon } from 'lucide-react'
import { dcHref } from '@/lib/dc-routes'

/** Porte do renderVals() de SAGA Nova Campanha.dc.html. */

/** Sistemas disponíveis (app/(app)/campanhas/nova/page.tsx): pré-definidos + os seus. */
export type NovaCampanhaDados = {
  sistemas: { id: string; n: string; cat: string; die: string; attrs: number; meta: 'Oficial' | 'Seu homebrew' | 'Comunidade' }[]
}

const LEATHER: Record<string, string> = { fantasy: 'linear-gradient(150deg,#7a4a14,#4a2a08 60%,#2a1804)', wod: 'linear-gradient(150deg,#5a1a2e,#36101c 60%,#1c080e)', horror: 'linear-gradient(150deg,#6a1414,#3e0a0a 60%,#1e0505)', scifi: 'linear-gradient(150deg,#1e4a4a,#123030 60%,#081a1a)' }
// Categoria do banco → couro e ícone da lombada (genérico e personalizado usam o couro de fantasia).
const CAT: Record<string, { leather: string; icon: LucideIcon }> = {
  fantasy: { leather: LEATHER.fantasy, icon: Swords }, 'world-of-darkness': { leather: LEATHER.wod, icon: Moon },
  horror: { leather: LEATHER.horror, icon: Eye }, scifi: { leather: LEATHER.scifi, icon: Cpu },
  generic: { leather: LEATHER.fantasy, icon: Dices }, custom: { leather: LEATHER.fantasy, icon: Feather },
}
const COVERS = ['linear-gradient(135deg,#2a1c08,#c9a22a)', 'linear-gradient(135deg,#0b0c11,#6a2817)', 'linear-gradient(135deg,#0e1a1c,#3a5a5a)', 'linear-gradient(135deg,#1a0c04,#d9662b)', 'linear-gradient(135deg,#140a1a,#8a2a5a)', 'linear-gradient(135deg,#1e1a14,#6a5a3a)']
const DAYS: [string, string][] = [['seg', 'Segunda'], ['ter', 'Terça'], ['qua', 'Quarta'], ['qui', 'Quinta'], ['sex', 'Sexta'], ['sáb', 'Sábado'], ['dom', 'Domingo']]
const STEPS: [string, string][] = [['Crônica', 'Nome, tom e capa'], ['Sistema', 'Regras e fichas'], ['Mesa', 'Agenda e jogadores'], ['Convites', 'Código e Taverna']]
const R = ['I', 'II', 'III', 'IV']
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const TONS = ['Épico', 'Sombrio', 'Mistério', 'Horror', 'Político', 'Exploração', 'Combate', 'Cômico']
// Tons do design → campos que a campanha já tem (contentTone único + playStyle em JSON).
const TOM: Record<string, string> = { 'Épico': 'epic', 'Sombrio': 'dark', 'Horror': 'horror', 'Político': 'political' }
const ESTILO: Record<string, string> = { 'Mistério': 'mystery', 'Exploração': 'exploration', 'Combate': 'combat', 'Cômico': 'comedy', 'Horror': 'horror' }
const FREQ: Record<string, string> = { 'Semanal': 'weekly', 'Quinzenal': 'biweekly', 'Mensal': 'monthly' }
const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const rnd = () => Array.from({ length: 8 }, () => A[Math.floor(Math.random() * A.length)]).join('')
const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export function useNovaCampanhaVals(d: NovaCampanhaDados) {
  const [step, setStep] = useState(0)
  const [maxStep, setMaxStep] = useState(0)
  const [name, setName] = useState('')
  const [pitch, setPitch] = useState('')
  const [cover, setCover] = useState(0)
  const [tones, setTones] = useState<string[]>(['Épico'])
  const [rating, setRating] = useState('Livre')
  const [sys, setSys] = useState(0)
  const [imp, setImp] = useState(true)
  const [rollVis, setRollVis] = useState('Todos')
  const [fmt, setFmt] = useState('Campanha')
  const [freq, setFreq] = useState('Semanal')
  const [day, setDay] = useState('qua')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('20:00')
  const [dur, setDur] = useState(3.5)
  const [seats, setSeats] = useState(4)
  const [venue, setVenue] = useState('saga')
  const [code, setCode] = useState('')
  const [codeTick, setCodeTick] = useState(0)
  const [copied, setCopied] = useState(false)
  const [discord, setDiscord] = useState(true)
  const [server, setServer] = useState<string | null>(null)
  const [channel, setChannel] = useState('#nova-cronica')
  const [publish, setPublish] = useState(false)
  const [newbie, setNewbie] = useState(true)
  const [approve, setApprove] = useState(true)
  const [call, setCall] = useState('')
  const [err, setErr] = useState('')
  const [shake, setShake] = useState(0)
  const [sealing, setSealing] = useState(false)
  const [doneId, setDoneId] = useState<string | null>(null)
  const iv = useRef<ReturnType<typeof setInterval>>()
  const tc = useRef<ReturnType<typeof setTimeout>>()

  // Código e data começam no navegador (aleatório e "hoje" não podem vir do servidor sem diferença na hidratação).
  useEffect(() => { setCode(rnd()); setDate(hojeISO()); return () => { clearInterval(iv.current); clearTimeout(tc.current) } }, [])

  const fail = (e: string) => { setErr(e); setShake(n => n + 1) }
  const sy = d.sistemas[sys] ?? { id: '', n: '—', cat: 'custom', die: '—', attrs: 0, meta: 'Oficial' as const }
  const dayName = (DAYS.find(x => x[0] === day) ?? DAYS[2])[1]
  const [, mm, dd] = (date || '0000-01-01').split('-')
  const nm = name.trim()
  const codeDash = code ? `${code.slice(0, 4)}-${code.slice(4)}` : ''

  const salvar = async () => {
    setSealing(true); setErr('')
    const corpo = {
      name: nm, description: pitch.trim() || null, systemId: sy.id || undefined,
      campaignType: fmt === 'One-shot' ? 'oneshot' : 'campaign',
      contentTone: tones.map(t => TOM[t]).find(Boolean) ?? null,
      playStyle: (() => { const p = Array.from(new Set(tones.map(t => ESTILO[t]).filter(Boolean))); return p.length ? JSON.stringify(p) : null })(),
      sessionFrequency: fmt === 'One-shot' ? null : FREQ[freq] ?? null,
      minExperience: newbie ? null : 'intermediate',
      isOpen: publish, maxSlots: seats,
      // TODO(api): campos novos da Nova Campanha (docs/api-pendente.md). A API atual ignora os que não conhece.
      capa: cover, tons: tones, classificacao: rating, permitirImportadas: imp, visibilidadeRolagens: rollVis,
      agenda: { dia: day, primeiraSessao: date, horario: time, duracaoHoras: dur }, local: venue, inviteCode: code,
      discord: discord ? { servidor: server, canal: channel } : null, aprovarInscricoes: approve, chamadaTaverna: call.trim() || null,
    }
    const res = await fetch('/api/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) }).catch(() => null)
    const camp = res?.ok ? await res.json().catch(() => null) as { id?: string } | null : null
    setTimeout(() => {
      setSealing(false)
      if (camp?.id) setDoneId(camp.id)
      else fail('Não foi possível concluir agora. Tente de novo.')
    }, 900)
  }
  const next = () => {
    if (step === 0 && !nm) return fail('Toda crônica precisa de um nome.')
    if (step === 3) { if (!sealing) void salvar(); return }
    setStep(step + 1); setMaxStep(Math.max(maxStep, step + 1)); setErr('')
  }
  const reroll = () => {
    clearInterval(iv.current); let n = 0
    iv.current = setInterval(() => { n++; setCode(rnd()); setCodeTick(t => t + 1); if (n >= 5) clearInterval(iv.current) }, 80)
  }

  const seg = (arr: string[], cur: string, set: (k: string) => void) => arr.map(l => {
    const on = cur === l
    return { l, go: () => set(l), bg: on ? 'var(--surface)' : 'transparent', color: on ? 'var(--ink)' : 'var(--muted)', sh: on ? '0 1px 2px rgb(0 0 0/.1)' : 'none' }
  })
  const chip = (arr: [string, string][], isOn: (k: string) => boolean, tap: (k: string) => void) => arr.map(([k, l]) => {
    const on = isOn(k)
    return { l, go: () => tap(k), bg: on ? 'var(--ink)' : 'var(--surface)', color: on ? 'var(--bg)' : 'var(--ink)', ring: on ? 'var(--ink)' : 'var(--line)' }
  })
  const sw = (on: boolean, go: () => void) => ({ track: on ? 'var(--accent)' : 'var(--line)', knob: on ? '21px' : '3px', go })

  const checks: [boolean, string][] = [
    [!!nm, nm ? `“${nm}”` : 'Falta o nome'],
    [true, `${sy.n} · ${sy.attrs} atributos`],
    [true, fmt === 'One-shot' ? `One-shot · ${dayName} às ${time}` : `${freq} · ${dayName} às ${time}`],
    [true, `${seats} vagas · convite ${codeDash}`],
    [publish, publish ? 'Anunciada na Taverna' : 'Fora da Taverna (só por convite)'],
  ]

  return {
    $href: (link: string) => dcHref(link, { campaignId: doneId ?? undefined }),
    $img: (_id: string): string | null => null, // TODO(api): upload da capa
    steps: STEPS.map(([t, dd2], i) => {
      const cur = i === step, done = i < step || (i <= maxStep && !cur && i < maxStep), ok = i <= maxStep
      return { t, d: dd2, num: done ? '✓' : R[i], cur: ok ? 'pointer' : 'default', op: ok ? 1 : 0.5, bg: cur ? 'var(--surface)' : 'transparent', ring: cur || done ? 'var(--accent)' : 'var(--line)', ib: done ? 'var(--accent)' : cur ? 'var(--accent-t)' : 'transparent', ic: done ? '#fff8f0' : cur ? 'var(--accent)' : 'var(--muted)', go: () => { if (ok) { setStep(i); setErr('') } } }
    }),
    pct: Math.round(step / 3 * 100), stepN: step + 1,
    s1: step === 0, s2: step === 1, s3: step === 2, s4: step === 3,
    name, onName: (e: ChangeEvent<HTMLInputElement>) => { setName(e.target.value); setErr('') }, nameCount: `${name.length}/60`,
    pitch, onPitch: (e: ChangeEvent<HTMLTextAreaElement>) => setPitch(e.target.value), pitchCount: `${pitch.length}/220`,
    covers: COVERS.map((bg, i) => ({ bg, go: () => setCover(i), ring: cover === i ? '0 0 0 2px var(--surface), 0 0 0 4px var(--accent)' : 'inset 0 0 0 1px rgb(0 0 0/.15)' })),
    tones: chip(TONS.map(t => [t, t]), k => tones.includes(k), k => setTones(tones.includes(k) ? tones.filter(x => x !== k) : [...tones, k])),
    ratings: seg(['Livre', '14+', '18+'], rating, setRating),
    systems: d.sistemas.map((x, i) => {
      const cat = CAT[x.cat] ?? CAT.custom
      return { n: x.n, meta: x.meta, icon: cat.icon, leather: cat.leather, on: sys === i, go: () => setSys(i), sh: sys === i ? '0 0 0 3px var(--accent), 0 18px 26px -14px rgb(40 15 5/.7)' : '0 14px 22px -14px rgb(40 15 5/.65), 2px 0 0 #e6d5ac, 4px 0 0 #d8c39a', tf: sys === i ? 'translateY(-4px) rotate(-1deg)' : 'none' }
    }),
    sysFacts: [{ k: 'Sistema', v: sy.n }, { k: 'Dado base', v: sy.die }, { k: 'Atributos', v: sy.attrs }, { k: 'Fichas', v: 'Prontas para todos' }],
    swImport: sw(imp, () => setImp(!imp)),
    rollVis: seg(['Todos', 'Só o mestre', 'Cada um escolhe'], rollVis, setRollVis),
    fmts: seg(['Campanha', 'One-shot'], fmt, setFmt), isCamp: fmt === 'Campanha',
    freqs: seg(['Semanal', 'Quinzenal', 'Mensal'], freq, setFreq),
    days: chip(DAYS.map(x => [x[0], x[1].slice(0, 3)]), k => day === k, setDay),
    date, onDate: (e: ChangeEvent<HTMLInputElement>) => setDate(e.target.value), time, onTime: (e: ChangeEvent<HTMLInputElement>) => setTime(e.target.value),
    dur, onDur: (e: ChangeEvent<HTMLInputElement>) => setDur(+e.target.value), durLabel: `${String(dur).replace('.', ',')} h`,
    seats, seatDn: () => setSeats(Math.max(2, seats - 1)), seatUp: () => setSeats(Math.min(8, seats + 1)),
    seatList: [{ l: 'M', t: 'Você (mestre)', bg: '#b98a2a', ring: 'transparent' }, ...Array.from({ length: seats }, (_, j) => ({ l: '', t: `Vaga ${j + 1}`, bg: 'transparent', ring: 'var(--muted)' }))],
    venues: ([['saga', 'Mesa virtual do Saga', 'Mapa, tokens e dados ao vivo', MapIcon], ['presencial', 'Presencial', 'O Saga guarda fichas e agenda', Castle], ['discord', 'Voz no Discord', 'Fichas e rolagens pelo Saga', Headphones]] as const).map(([k, t, dd2, icon]) => {
      const on = venue === k
      return { t, d: dd2, icon, go: () => setVenue(k), bg: on ? 'var(--accent-t)' : 'var(--surface)', rw: on ? '2px' : '1px', ring: on ? 'var(--accent)' : 'var(--line)' }
    }),
    codeChars: code.split('').map((c, i) => ({ c, gap: i === 3 ? '10px' : '0', anim: codeTick ? `${codeTick % 2 ? 'novacampanha-rerollA' : 'novacampanha-rerollB'} .22s ${(i * 0.02).toFixed(2)}s both` : 'none' })),
    codeFlat: code, codeDash, reroll,
    copy: () => { try { void navigator.clipboard?.writeText(codeDash) } catch { /* sem clipboard */ } setCopied(true); clearTimeout(tc.current); tc.current = setTimeout(() => setCopied(false), 1600) },
    copyLabel: copied ? 'Copiado' : 'Copiar', copyIcon: copied ? Check : Copy,
    swDiscord: sw(discord, () => setDiscord(!discord)), discordOn: discord,
    // TODO(api): servidores do Discord em que o bot está e você pode gerenciar.
    servers: chip([] as [string, string][], k => server === k, setServer),
    channel, onChannel: (e: ChangeEvent<HTMLInputElement>) => setChannel(e.target.value),
    swPublish: sw(publish, () => setPublish(!publish)), publishOn: publish,
    swNewbie: sw(newbie, () => setNewbie(!newbie)), swApprove: sw(approve, () => setApprove(!approve)),
    call, onCall: (e: ChangeEvent<HTMLTextAreaElement>) => setCall(e.target.value), callCount: `${call.length}/160`,
    checks: checks.map(([ok, t]) => ({ t, m: ok ? '✓' : '·', bg: ok ? 'var(--ok)' : 'var(--line)', color: ok ? 'var(--ink)' : 'var(--muted)' })),
    canBack: step > 0, prev: () => { setStep(step - 1); setErr('') }, next,
    notLast: step < 3, isLast: step === 3, nextLabel: ['Escolher sistema', 'Montar a mesa', 'Preparar convites'][step] ?? 'Continuar',
    hasErr: !!err, err, errAnim: shake ? `${shake % 2 ? 'novacampanha-shakeA' : 'novacampanha-shakeB'} .4s` : 'none',
    cover: COVERS[cover], init: ((nm.replace(/^(A|O|Os|As) /, '')[0]) || '?').toUpperCase(), sysName: sy.n,
    pvName: nm || 'Sua nova crônica', pvNameColor: nm ? 'var(--ink)' : 'var(--muted)',
    freqLine: `${fmt === 'One-shot' ? 'One-shot' : freq} · ${dayName.slice(0, 3).toLowerCase()} ${time.slice(0, 2)}h`,
    toneLine: tones.join(' · '), seatsLine: `${seats} vagas`, nextLine: date ? `1ª sessão ${+dd} ${MES[+mm - 1] ?? ''}` : '',
    isSealing: sealing, done: !!doneId,
  }
}

export type Vals = ReturnType<typeof useNovaCampanhaVals>
