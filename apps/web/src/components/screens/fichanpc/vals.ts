'use client'

import { useRef, useState, type ChangeEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { dcHref } from '@/lib/dc-routes'
import { safeImageUrl } from '@/lib/safe-url'
import { useFichaSistema, type FichaSistemaDados } from '@/lib/ficha-sistema/montar'
import type { SistemaSpec } from '@/lib/ficha-sistema/spec'

/** SAGA Ficha NPC: a Ficha por Sistema em modo NPC (sem dono; só o mestre edita e rola). */
export type FichaNpcDados = FichaSistemaDados & {
  campaignId: string; npcId: string; tipo: string; publico: boolean; souMestre: boolean
  jogadores: { memberId: string; u: string }[]; vis: string[]
  /** Segredos do Mestre (texto `gm_secrets`); null para jogadores, que nunca recebem. */
  segredo: string | null
}

const TIPO: Record<string, [string, string]> = {
  VILLAIN: ['Vilão', '#8a1c24'], ENEMY: ['Inimigo', '#8a1c24'], ALLY: ['Aliado', '#4f7a3a'], MERCHANT: ['Mercador', '#9c7a2a'],
  MOUNT: ['Montaria', '#3a6a7a'], NEUTRAL: ['Neutro', '#76695a'], FAMILIAR: ['Familiar', '#76695a'], SERVANT: ['Servo', '#76695a'], OTHER: ['Outro', '#76695a'],
}
const AVS = ['linear-gradient(135deg,#3a6a4a,#1e3a28)', 'linear-gradient(135deg,#7a4a14,#3a2208)', 'linear-gradient(135deg,#5a1a2e,#2a0a16)', 'linear-gradient(135deg,#6a5a3a,#2e2618)']
const json = (url: string, method: string, body?: unknown) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).catch(() => null)

export function useFichaNpcVals(d: FichaNpcDados, spec: SistemaSpec) {
  const gm = d.souMestre
  const api = `/api/campaigns/${d.campaignId}/npcs/${d.npcId}`
  // Mestre pode ver a ficha "como jogador": só leitura, sem rolar, sem segredos.
  const [visao, setVisao] = useState<'mestre' | 'jogador'>(gm ? 'mestre' : 'jogador')
  const gmV = gm && visao === 'mestre'
  const v = useFichaSistema({ ...d, podeEditar: gmV, podeRolar: gmV, pvUrl: api }, spec)
  const [publico, setPublico] = useState(d.publico)
  const [vis, setVis] = useState(d.vis)
  const [segredo, setSegredo] = useState(d.segredo ?? '')
  const t = useRef<ReturnType<typeof setTimeout>>()

  const ve = (id: string) => publico || vis.includes(id)
  const alterna = (id: string) => {
    if (!gm) return
    if (publico) {
      // Desligar um jogador num NPC público passa a valer por jogador (como na tela NPCs).
      const outros = d.jogadores.map(j => j.memberId).filter(x => x !== id)
      setPublico(false); setVis(outros)
      void json(api, 'PATCH', { isPublic: false })
      d.jogadores.forEach(j => { void json(`${api}/visibility`, 'PATCH', { memberId: j.memberId, canView: j.memberId !== id }) })
      return
    }
    const on = vis.includes(id)
    setVis(xs => on ? xs.filter(x => x !== id) : [...xs, id])
    void json(`${api}/visibility`, 'PATCH', { memberId: id, canView: !on })
  }
  const todos = d.jogadores.length > 0 && d.jogadores.every(j => ve(j.memberId))
  const [tipoL, tipoC] = TIPO[d.tipo] ?? TIPO.NEUTRAL!

  return {
    ...v,
    $href: (link: string) => dcHref(link, { campaignId: d.campaignId }),
    img: safeImageUrl(v.img),
    mostruario: false, famNote: '', fams: [] as { l: string; icon: typeof v.famIcon; n: number; on: boolean; go: () => void; color: string; line: string }[],
    systems: [] as { n: string; go: () => void; bg: string; color: string; ring: string }[], sysId: d.sistema,
    hasAspects: false, aspects: [] as { k: string; v: string }[], sections: [] as string[],
    npcGM: gmV, npcPlayer: !gmV, trocaVisao: gm,
    npcLead: gmV ? 'Só o Mestre edita e rola. Os jogadores veem a ficha só depois de revelada, e sem os segredos.' : 'Ficha revelada pelo Mestre. Só leitura.',
    npcType: tipoL, npcTypeBg: tipoC, npcStripBg: gmV ? 'var(--surface)' : 'var(--surface2)', npcStripRing: 'var(--line)',
    npcVis: d.jogadores.map((j, k) => {
      const on = ve(j.memberId)
      return { u: j.u, i: (j.u[0] ?? '?').toUpperCase(), av: AVS[k % AVS.length]!, on, op: on ? 1 : .45, icon: on ? Eye : EyeOff, t: on ? `@${j.u} vê esta ficha` : `Escondida de @${j.u}`,
        bg: on ? 'color-mix(in oklab, var(--ok) 10%, var(--surface))' : 'var(--surface)', ring: on ? 'color-mix(in oklab, var(--ok) 40%, var(--line))' : 'var(--line)', go: () => alterna(j.memberId) }
    }),
    npcRevealL: todos ? 'Esconder de todos' : 'Revelar a todos',
    npcRevealAll: () => {
      if (!gm) return
      if (todos) { setPublico(false); setVis([]); void json(api, 'PATCH', { isPublic: false }); d.jogadores.forEach(j => { void json(`${api}/visibility`, 'PATCH', { memberId: j.memberId, canView: false }) }) }
      else { setPublico(true); void json(api, 'PATCH', { isPublic: true }) }
    },
    npcViews: ([['mestre', 'Mestre'], ['jogador', 'Jogador']] as const).map(([k, l]) => { const on = k === visao; return { l, go: () => setVisao(k), bg: on ? 'var(--surface)' : 'transparent', color: on ? 'var(--ink)' : 'var(--muted)', sh: on ? '0 1px 2px rgb(0 0 0/.1)' : 'none' } }),
    npcSecret: segredo,
    npcOnSecret: (e: ChangeEvent<HTMLTextAreaElement>) => {
      if (!gm) return
      const val = e.target.value; setSegredo(val)
      clearTimeout(t.current); t.current = setTimeout(() => { void json(`/api/characters/${d.npcId}/text-fields`, 'POST', { key: 'gm_secrets', label: 'Segredos do Mestre', value: val }) }, 600)
    },
  }
}

export type Vals = ReturnType<typeof useFichaNpcVals>
