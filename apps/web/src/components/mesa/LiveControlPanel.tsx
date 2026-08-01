import { type Dispatch, type SetStateAction } from 'react'
import { Radio, X, Wifi, WifiOff } from 'lucide-react'
import { Fleuron } from '@/components/landing/Ornament'
import type { Member, Token } from './types'

interface Props {
  campaignId: string
  members: Member[]
  liveMembers: string[]
  setLiveMembers: (next: string[]) => void
  expandedLiveMember: string | null
  setExpandedLiveMember: Dispatch<SetStateAction<string | null>>
  tokens: Token[]
  setTokens: (next: Token[]) => void
  syncTokens: (next: Token[]) => void
  onClose: () => void
}

export function LiveControlPanel({
  campaignId, members, liveMembers, setLiveMembers,
  expandedLiveMember, setExpandedLiveMember,
  tokens, setTokens, syncTokens, onClose,
}: Props) {
  return (
    <div className="absolute top-full right-0 mt-1.5 z-[60] w-72 max-w-[85vw] rounded-xl border border-border shadow-2xl overflow-hidden bg-surface backdrop-blur-md">
      <div className="px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio size={12} className="text-emerald-400"/>
          <span className="font-cinzel text-[11px] font-bold text-saga-muted uppercase tracking-widest">Controle Ao Vivo</span>
          <Fleuron className="h-2 w-auto text-gold/50" />
        </div>
        <button onClick={onClose} className="text-saga-dim hover:text-saga-text"><X size={13}/></button>
      </div>
      <div className="p-3">
        <p className="text-[10px] text-saga-dim mb-3 leading-relaxed">
          Jogadores com "Ao Vivo" ativado podem mover tokens que todos verão em tempo real.
        </p>
        {members.filter(m => m.role !== 'GM').length === 0 ? (
          <p className="text-[11px] text-saga-dim text-center py-3">Nenhum jogador na sessão.</p>
        ) : (
          <div className="space-y-1.5">
            {members.filter(m => m.role !== 'GM').map(m => {
              const hasLive = liveMembers.includes(m.id)
              const isExpanded = expandedLiveMember === m.id
              const otherTokens = tokens.filter(t => t.id !== m.id)
              function toggleLive() {
                const next = hasLive
                  ? liveMembers.filter(id => id !== m.id)
                  : [...liveMembers, m.id]
                setLiveMembers(next)
                if (!next.includes(m.id)) setExpandedLiveMember(e => e === m.id ? null : e)
                fetch(`/api/campaigns/${campaignId}/sessions/state`, {
                  method: 'PATCH',
                  headers: {'Content-Type':'application/json'},
                  body: JSON.stringify({ liveMembersJson: JSON.stringify(next) }),
                }).catch(() => {})
              }
              function toggleTokenPermission(tokenId: string) {
                const updated = tokens.map(t => {
                  if (t.id !== tokenId) return t
                  const allowed = t.allowedPlayers ?? []
                  const hasPerm = allowed.includes(m.id)
                  return { ...t, allowedPlayers: hasPerm ? allowed.filter(id => id !== m.id) : [...allowed, m.id] }
                })
                setTokens(updated)
                syncTokens(updated)
              }
              return (
                <div key={m.id} className="space-y-1">
                  <div
                    className={`flex items-center justify-between px-3 py-2 rounded transition-all border ${
                      hasLive ? 'bg-emerald-500/[0.08] border-emerald-500/25' : 'bg-ink/[0.03] border-ink/20 dark:border-bg/60'
                    }`}>
                    <div className="flex items-center gap-2">
                      {hasLive
                        ? <Wifi size={11} className="text-emerald-400 shrink-0"/>
                        : <WifiOff size={11} className="text-saga-dim shrink-0"/>
                      }
                      <div>
                        <p className="font-cormorant text-[13px] font-medium text-saga-text">{m.character?.name ?? m.user.username}</p>
                        {m.character?.name && (
                          <p className="text-[9px] text-saga-dim">{m.user.username}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasLive && otherTokens.length > 0 && (
                        <button
                          onClick={() => setExpandedLiveMember(isExpanded ? null : m.id)}
                          title="Tokens extras que este jogador pode mover"
                          className={`text-[9px] px-1.5 py-0.5 rounded transition-all border ${isExpanded ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' : 'text-saga-dim border-ink/20 dark:border-bg/60 hover:text-emerald-400 hover:border-emerald-400/20'}`}>
                          Tokens
                        </button>
                      )}
                      <button onClick={toggleLive}
                        className={`relative w-9 h-5 rounded-full transition-all shrink-0 ${hasLive ? 'bg-emerald-500' : 'bg-ink/10'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${hasLive ? 'left-4' : 'left-0.5'}`}/>
                      </button>
                    </div>
                  </div>
                  {hasLive && isExpanded && otherTokens.length > 0 && (
                    <div className="ml-2 px-2.5 py-2 rounded border border-emerald-400/10 space-y-1.5 bg-emerald-500/[0.04]">
                      <p className="text-[9px] text-saga-dim">Tokens extras que <span className="text-saga-muted">{m.character?.name ?? m.user.username}</span> pode mover:</p>
                      {otherTokens.map(t => {
                        const checked = (t.allowedPlayers ?? []).includes(m.id)
                        return (
                          <label key={t.id} className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTokenPermission(t.id)}
                              className="accent-emerald-500 w-3 h-3 shrink-0"
                            />
                            <span className={`text-[11px] transition-colors truncate ${checked ? 'text-emerald-300' : 'text-saga-muted group-hover:text-saga-text'}`}>
                              {t.label}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        {liveMembers.length > 0 && (
          <button
            onClick={() => {
              setLiveMembers([])
              fetch(`/api/campaigns/${campaignId}/sessions/state`, {
                method: 'PATCH',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ liveMembersJson: '[]' }),
              }).catch(() => {})
            }}
            className="mt-3 w-full py-1.5 rounded text-[11px] text-saga-dim hover:text-saga-danger transition-colors border border-ink/20 dark:border-bg/60 hover:border-saga-danger/30">
            Desativar todos
          </button>
        )}
      </div>
    </div>
  )
}
