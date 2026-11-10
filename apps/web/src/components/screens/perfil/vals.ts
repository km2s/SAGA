'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link as LinkIcon, Mail, RefreshCw, Shield, SlidersHorizontal, Trash2, Upload, UserRound, type LucideIcon } from 'lucide-react'
import { GoogleIcon } from '@/components/ui/saga'
import { toggleTema } from '@/lib/tema'
import { useRouter } from 'next/navigation'
import { enviarImagem, escolherImagem } from '@/lib/enviar-imagem'

/** Dados reais de /perfil (app/(app)/perfil/page.tsx). */
export type PerfilDados = {
  nome: string; user: string; avatar: string | null
  stats: { sessoes: number; horas: number; rolagens: number; vintes: number }
  titulos: string[]
  favs: string[]
  ultimaSync: string
  inviteUrl: string | null
  aba: string
  bio: string; titulo: string | null; moldura: string | null
  discord: { avatar: number; nome: number; dm: number; rolls: number }
}

const FR: Record<string, string> = { Ouro: 'conic-gradient(from 30deg,#8a6320,#f3dc94,#c9a22a,#8a6320,#f3dc94,#8a6320)', Cera: 'radial-gradient(circle at 35% 30%, #c95a3a, #a8262f 50%, #5a1015)', Ferro: 'conic-gradient(from 0deg,#4a4a4a,#b8b8b0,#6a6a66,#2e2e2e,#9a9a94,#4a4a4a)', Sangue: 'conic-gradient(from 90deg,#3a0a0e,#c8424c,#5a1015,#8a1c24,#3a0a0e)' }
const PREFS = 'saga_preferencias'
type Prefs = { anim: number; sons: number; email: number; resumo: number }
const n = (v: number) => v.toLocaleString('pt-BR')
// GoogleIcon tem a assinatura de ícone do lucide que o DynIcon espera.
const Google = (({ width }: { width?: number | string }) => GoogleIcon({ size: Number(width) || 22 })) as unknown as LucideIcon

export function usePerfilVals(d: PerfilDados) {
  const [tab, setTab] = useState(d.aba)
  const [menu, setMenu] = useState(false)
  // Foto: a do Discord, uma enviada (bucket) ou nenhuma. Muda na hora, sem "Salvar".
  const [av, setAv] = useState<'discord' | 'custom' | 'none'>(d.discord.avatar === 0 ? (d.avatar ? 'custom' : 'none') : 'discord')
  const [foto, setFoto] = useState(d.avatar)
  const [fotoMsg, setFotoMsg] = useState('')
  const [frame, setFrame] = useState(d.moldura && FR[d.moldura] ? d.moldura : 'Ouro')
  const [name, setName] = useState(d.nome)
  const [user, setUser] = useState(d.user)
  const [bio, setBio] = useState(d.bio)
  const [title, setTitle] = useState(d.titulo && d.titulos.includes(d.titulo) ? d.titulo : d.titulos[0] ?? '')
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dcOpt, setDcOpt] = useState(d.discord)
  const [syncing, setSyncing] = useState(false)
  const [synced, setSynced] = useState(false)
  const [pref, setPref] = useState<Prefs>({ anim: 1, sons: 0, email: 1, resumo: 1 })
  const [themePref, setThemePref] = useState<string | null>(null)
  const [escuro, setEscuro] = useState(false)
  const t1 = useRef<ReturnType<typeof setTimeout>>()
  const router = useRouter()

  useEffect(() => {
    setEscuro(document.documentElement.getAttribute('data-tema') === 'escuro')
    try { const raw = localStorage.getItem(PREFS); if (raw) setPref(p => ({ ...p, ...JSON.parse(raw) as Prefs })) } catch { /* sem preferências */ }
    return () => clearTimeout(t1.current)
  }, [])
  const mark = () => { setDirty(true); setSaved(false) }
  const sw = (on: number | boolean) => ({ track: on ? 'var(--accent)' : 'var(--line)', knob: on ? '21px' : '3px' })
  const tabs: [string, string, LucideIcon][] = [['perfil', 'Perfil', UserRound], ['conexoes', 'Conexões', LinkIcon], ['conta', 'Conta', Shield], ['pref', 'Preferências', SlidersHorizontal]]
  const themeCur = themePref ?? (escuro ? 'Escuro' : 'Claro')
  const temaPara = (alvo: boolean) => { if (alvo !== escuro) { toggleTema(); setEscuro(alvo) } }

  const save = async () => {
    if (!dirty) return
    // O @ é o do Discord (volta a cada login): só nome, bio, título e moldura são gravados.
    const r = await fetch('/api/perfil', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: name, bio, titulo: title, moldura: frame }) }).catch(() => null)
    if (r?.ok) { setDirty(false); setSaved(true); setUser(d.user) }
  }

  const patchFoto = async (avatar: string) => {
    const r = await fetch('/api/perfil', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ avatar }) }).catch(() => null)
    return r?.ok ? await r.json().catch(() => null) as { avatar?: string | null } | null : null
  }
  const trocarFoto = async (k: 'discord' | 'custom' | 'none') => {
    setFotoMsg('')
    if (k === 'custom') {
      const file = await escolherImagem()
      if (!file) return
      setFotoMsg('Enviando a foto…')
      const up = await enviarImagem(file, { para: 'avatar' })
      if ('erro' in up) { setFotoMsg(up.erro); return }
      const u = await patchFoto(up.url)
      if (!u) { setFotoMsg('Não foi possível salvar a foto. Tente de novo.'); return }
      setFoto(up.url); setAv('custom'); setFotoMsg('✓ Foto atualizada'); router.refresh()
      return
    }
    const u = await patchFoto(k === 'discord' ? 'discord' : 'nenhuma')
    if (!u) { setFotoMsg('Não foi possível concluir agora. Tente de novo.'); return }
    setFoto(u.avatar ?? null); setAv(k); setFotoMsg(k === 'discord' ? '✓ Usando a foto do Discord' : '✓ Foto removida'); router.refresh()
  }

  return {
    $img: (_id: string) => foto,
    tabs: tabs.map(([k, l, icon]) => ({ l, icon, go: () => { setTab(k); window.history.replaceState(null, '', k === 'perfil' ? '/perfil' : `?aba=${k}`) }, color: tab === k ? 'var(--ink)' : 'var(--muted)', line: tab === k ? 'inset 0 -2px 0 var(--accent)' : 'none' })),
    isPerfil: tab === 'perfil', isCon: tab === 'conexoes', isConta: tab === 'conta', isPref: tab === 'pref',
    menu, toggleMenu: () => setMenu(!menu),
    // Com foto, a imagem; sem foto, a inicial no medalhão.
    avCustom: !!foto, avDiscord: !foto, frameBg: FR[frame],
    avOpts: ([['Usar avatar do Discord', RefreshCw, 'discord'], ['Enviar imagem…', Upload, 'custom'], ['Remover foto', Trash2, 'none']] as const).map(([l, icon, k]) => ({
      l, icon, color: k === 'none' ? 'var(--accent)' : 'var(--ink)', check: av === k ? '✓' : '', go: () => { setMenu(false); void trocarFoto(k) },
    })),
    name, initial: (name || '?')[0].toUpperCase(), user, bio, bioCount: bio.length, title,
    onName: (e: ChangeEvent<HTMLInputElement>) => { setName(e.target.value); mark() },
    onUser: (e: ChangeEvent<HTMLInputElement>) => { setUser(e.target.value.replace(/\s/g, '_')); mark() },
    onBio: (e: ChangeEvent<HTMLTextAreaElement>) => { setBio(e.target.value); mark() },
    discordState: 'Discord sincronizado',
    stats: [{ v: n(d.stats.sessoes), l: 'sessões' }, { v: `${n(d.stats.horas)} h`, l: 'na mesa' }, { v: n(d.stats.rolagens), l: 'dados rolados' }, { v: n(d.stats.vintes), l: 'vintes naturais' }],
    titles: d.titulos.map(l => ({ l, go: () => { setTitle(l); mark() }, bg: title === l ? 'var(--gold-t)' : 'var(--surface)', color: title === l ? 'color-mix(in oklab, var(--gold) 65%, var(--ink))' : 'var(--ink)', ring: title === l ? 'var(--gold)' : 'var(--line)' })),
    frames: Object.keys(FR).map(l => ({ l, bg: FR[l], go: () => { setFrame(l); mark() }, cardBg: frame === l ? 'var(--accent-t)' : 'var(--surface)', ring: frame === l ? 'var(--accent)' : 'var(--line)' })),
    favs: d.favs,
    save: () => void save(),
    saveBg: dirty ? 'var(--accent)' : 'var(--surface2)', saveColor: dirty ? '#fff8f0' : 'var(--muted)',
    saveMsg: fotoMsg || (saved ? '✓ Alterações salvas' : dirty ? 'Alterações não salvas' : ''), saveMsgColor: fotoMsg ? 'var(--muted)' : saved ? 'var(--ok)' : 'var(--muted)', saveAnim: saved ? 'perfil-pop .3s both' : 'none',
    // O login é pelo Discord: a conexão não pode ser desfeita daqui.
    dcOn: true, dcOff: false, dcSub: `Conectado como ${d.user} · login, avatar e bot`,
    dcToggle: () => { /* TODO(api): desconectar o Discord exige outro meio de login */ },
    lastSync: syncing ? 'Sincronizando…' : synced ? 'Sincronizado agora mesmo' : `Última sincronização ${d.ultimaSync}`,
    syncLabel: syncing ? 'Sincronizando' : 'Sincronizar agora', syncAnim: syncing ? 'perfil-spinR .8s linear infinite' : 'none',
    syncNow: async () => {
      if (syncing) return
      setSyncing(true)
      const [r] = await Promise.all([fetch('/api/perfil/sincronizar', { method: 'POST' }).catch(() => null), new Promise(res => { t1.current = setTimeout(res, 1600) })]) // TODO(api)
      setSyncing(false); setSynced(!!r?.ok)
      if (r?.ok) router.refresh()
    },
    dcOpts: ([['avatar', 'Sincronizar foto de perfil', 'Usa o avatar do Discord quando você não envia uma imagem.'], ['nome', 'Sincronizar nome de exibição', 'Mantém seu nome igual ao do Discord.'], ['dm', 'Lembretes de sessão por DM', 'O bot avisa 1 h antes de cada sessão marcada.'], ['rolls', 'Publicar rolagens no servidor', 'Rolagens da mesa aparecem no canal da campanha.']] as const)
      .map(([k, t, dd]) => ({ t, d: dd, ...sw(dcOpt[k]), go: () => {
        const next = { ...dcOpt, [k]: dcOpt[k] ? 0 : 1 }
        setDcOpt(next)
        void fetch('/api/perfil', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ discord: next }) }).catch(() => null)
      } })),
    servers: [] as { n: string; c: string; i: string; bg: string; s: string; sColor: string }[], // TODO(api): servidores com o bot
    inviteUrl: d.inviteUrl ?? '#',
    others: [
      { n: 'Google', icon: Google, bg: 'var(--surface)', fg: 'var(--ink)', sub: 'Entre também com sua conta Google', busy: false, btn: 'Conectar Google', btnBg: 'var(--ink)', btnColor: 'var(--bg)', btnRing: 'var(--ink)', go: () => { /* TODO(api): vincular Google */ } },
      { n: 'E-mail e senha', icon: Mail, bg: 'var(--surface)', fg: 'var(--ink)', sub: 'Ainda sem e-mail e senha', busy: false, btn: 'Gerenciar', btnBg: 'transparent', btnColor: 'var(--ink)', btnRing: 'var(--line)', go: () => setTab('conta') },
    ],
    email: '—', senhaQuando: '—', // TODO(api): login por e-mail
    toggle2fa: () => { /* TODO(api): verificação em duas etapas */ }, tfaTrack: 'var(--line)', tfaKnob: '3px',
    devices: [] as { n: string; s: string; icon: LucideIcon; cur: boolean; other: boolean; out: () => void }[], // TODO(api): sessões ativas
    themes: [['Claro', 'linear-gradient(135deg,#f6f1e7 50%,#fffcf6 50%)'], ['Escuro', 'linear-gradient(135deg,#16130f 50%,#1f1a15 50%)'], ['Sistema', 'linear-gradient(135deg,#f6f1e7 50%,#16130f 50%)']].map(([l, prev]) => ({
      l, prev, rw: themeCur === l ? '2px' : '1px', ring: themeCur === l ? 'var(--accent)' : 'var(--line)', dotW: themeCur === l ? '4px' : '1.5px',
      go: () => { setThemePref(l); temaPara(l === 'Escuro' ? true : l === 'Claro' ? false : matchMedia('(prefers-color-scheme: dark)').matches) },
    })),
    prefs: ([['anim', 'Animações de dados', 'Dados giram e quicam ao rolar.'], ['sons', 'Sons da mesa', 'Efeitos ao rolar e ao virar o turno.'], ['email', 'E-mails de convite e inscrição', 'Quando alguém responde à sua carta.'], ['resumo', 'Resumo semanal', 'Suas sessões da semana, toda segunda.']] as const)
      .map(([k, t, dd]) => ({
        t, d: dd, ...sw(pref[k]),
        go: () => { const next = { ...pref, [k]: pref[k] ? 0 : 1 }; setPref(next); try { localStorage.setItem(PREFS, JSON.stringify(next)) } catch { /* sem localStorage */ } }, // TODO(api): e-mails e resumo no servidor
      })),
  }
}

export type Vals = ReturnType<typeof usePerfilVals>
