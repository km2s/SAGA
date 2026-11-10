/**
 * Rolagens privadas: quem vê o quê. Regra única para o site e para o bot
 * (README do redesign, "Private rolls", e o combinado com a Karine em 2026-11-07).
 *
 * | Modo          | Quem escolhe | Quem rolou      | Mestre    | Outros jogadores        |
 * | PUBLIC        | todos        | resultado       | resultado | resultado               |
 * | GM_SECRET     | mestre       | resultado       | —         | "rolou em segredo"      |
 * | SELF          | jogador      | resultado       | nada      | nada                    |
 * | GM            | jogador      | resultado       | resultado | "rolou para o Mestre"   |
 * | BLIND         | jogador      | selado          | resultado | "rolou para o Mestre"   |
 *
 * Revelada (`revealedAt`) vale como pública.
 */

export type Visibilidade = 'PUBLIC' | 'SELF' | 'GM' | 'BLIND' | 'GM_SECRET'
/** full = vê tudo · sealed = sabe que rolou, sem resultado (a própria às cegas) · ghost = vê que alguém rolou, sem o quê nem o resultado · hide = não vê. */
export type ModoRolagem = 'full' | 'sealed' | 'ghost' | 'hide'

export interface Leitor { memberId: string; username: string; gm: boolean }
export interface RolagemVis { visibility: Visibilidade | string; revealedAt: Date | string | null; memberId: string | null; rolledBy: string }

export const VIS_MESTRE: Visibilidade[] = ['PUBLIC', 'GM_SECRET']
export const VIS_JOGADOR: Visibilidade[] = ['PUBLIC', 'SELF', 'GM', 'BLIND']

/** Rolagem é de quem lê? Usa o membro; nas antigas (sem memberId), o username. */
export function ehMinha(r: RolagemVis, l: Leitor): boolean {
  return r.memberId ? r.memberId === l.memberId : r.rolledBy === l.username
}

export function modoRolagem(r: RolagemVis, l: Leitor): ModoRolagem {
  if (r.visibility === 'PUBLIC' || r.revealedAt) return 'full'
  const minha = ehMinha(r, l)
  if (l.gm) return r.visibility === 'SELF' && !minha ? 'hide' : 'full'
  if (minha) return r.visibility === 'BLIND' ? 'sealed' : 'full'
  return r.visibility === 'SELF' ? 'hide' : 'ghost'
}

/** Visibilidade que o papel pode escolher; o resto vira pública. */
/**
 * `regra` = Campaign.rollVisibility (Painel › Config): "todos" deixa as rolagens
 * dos jogadores públicas; "mestre" manda todas ao mestre; "escolha" deixa cada um escolher.
 */
export function visibilidadeValida(v: unknown, gm: boolean, regra: string = 'escolha'): Visibilidade {
  if (!gm && regra === 'todos') return 'PUBLIC'
  if (!gm && regra === 'mestre') return 'GM'
  const ok = gm ? VIS_MESTRE : VIS_JOGADOR
  return typeof v === 'string' && (ok as string[]).includes(v) ? v as Visibilidade : 'PUBLIC'
}

export interface ContagemRolagens { total: number; publicas: number; secretas: number; paraMestre: number; cegas: number; soMinhas: number }

/** Conta só o que o leitor pode ver (as escondidas não entram nem no total). */
export function contarRolagens(rs: RolagemVis[], l: Leitor): ContagemRolagens {
  const c: ContagemRolagens = { total: 0, publicas: 0, secretas: 0, paraMestre: 0, cegas: 0, soMinhas: 0 }
  for (const r of rs) {
    if (modoRolagem(r, l) === 'hide') continue
    c.total++
    const v = r.revealedAt ? 'PUBLIC' : r.visibility
    if (v === 'PUBLIC') c.publicas++
    else if (v === 'GM_SECRET') c.secretas++
    else if (v === 'GM') c.paraMestre++
    else if (v === 'BLIND') c.cegas++
    else if (v === 'SELF') c.soMinhas++
  }
  return c
}

/** "30 rolagens · 10 privadas · 10 às cegas" (só os tipos que aparecem). */
export function resumoContagem(c: ContagemRolagens): string {
  const p = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`
  const partes = [p(c.total, 'rolagem', 'rolagens')]
  if (c.secretas) partes.push(p(c.secretas, 'secreta', 'secretas'))
  if (c.paraMestre) partes.push(p(c.paraMestre, 'para o Mestre', 'para o Mestre'))
  if (c.cegas) partes.push(p(c.cegas, 'às cegas', 'às cegas'))
  if (c.soMinhas) partes.push(p(c.soMinhas, 'só sua', 'só suas'))
  return partes.join(' · ')
}
