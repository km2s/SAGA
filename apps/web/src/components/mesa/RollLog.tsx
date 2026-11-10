import { type RefObject } from 'react'
import { X, Dice6, Sparkles, Skull } from 'lucide-react'
import { timeAgo, type RollLogEntry } from './types'

interface Props {
  rolls: RollLogEntry[]
  lastRollId: string | null
  activeSessionIsActive: boolean
  membersCount: number
  onCloseMobile: () => void
  chatEndRef: RefObject<HTMLDivElement>
}

export function RollLog({ rolls, lastRollId, activeSessionIsActive, membersCount, onCloseMobile, chatEndRef }: Props) {
  return (
    <>
      <div className="px-4 py-3 border-b border-ink/20 dark:border-bg/60 shrink-0 flex items-center justify-between">
        <span className="font-cinzel text-[11px] font-bold text-saga-muted uppercase tracking-widest">Chat da Sessão</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-saga-dim font-medium">{membersCount} membros</span>
          </div>
          <button onClick={onCloseMobile} className="sm:hidden text-saga-dim hover:text-saga-text ml-1">
            <X size={14}/>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {rolls.length===0&&(
          <div className="flex flex-col items-center justify-center h-32 gap-2 opacity-50">
            <Dice6 size={28} className="text-saga-dim"/>
            <p className="text-[11px] text-saga-dim text-center">{activeSessionIsActive?'Nenhuma rolagem ainda.':'Inicie uma sessão.'}</p>
          </div>
        )}
        {[...rolls].reverse().map(roll=>{
          const isChat = roll.expression === 'chat'
          if (isChat) {
            return (
              <div key={roll.id} className="flex gap-2 items-start">
                <div className="w-5 h-5 rounded-full bg-purple/60 flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5">
                  {roll.rolledBy[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5 mb-0.5">
                    <span className="font-cormorant text-[11px] font-medium text-saga-muted">{roll.rolledBy}</span>
                    <span className="text-[9px] text-saga-dim">{timeAgo(roll.rolledAt)}</span>
                  </div>
                  <p className="text-[12px] text-saga-text leading-relaxed break-words">{roll.attribute}</p>
                </div>
              </div>
            )
          }
          const arr=Array.isArray(roll.rolls)?(roll.rolls as number[]):[]
          const isCrit=arr.length===1&&arr[0]===20&&roll.expression.includes('d20')
          const isFail=arr.length===1&&arr[0]===1&&roll.expression.includes('d20')
          const isNew=roll.id===lastRollId
          return (
            <div key={roll.id}
              className={`rounded-lg overflow-hidden transition-all duration-300 border ${isNew?'scale-[1.02]':'scale-100'} ${
                isCrit ? 'bg-gradient-to-br from-gold/12 to-gold/[0.04] border-gold/30 shadow-[0_0_14px_rgba(201,162,42,0.12)]'
                : isFail ? 'bg-gradient-to-br from-saga-danger/12 to-saga-danger/[0.04] border-saga-danger/25'
                : 'bg-bg/40 border-ink/20 dark:border-bg/60'
              }`}>
              {(isCrit||isFail)&&(
                <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest font-cinzel text-center flex items-center justify-center gap-1 ${isCrit?'bg-gold/12 text-gold':'bg-saga-danger/12 text-saga-danger'}`}>
                  {isCrit?<><Sparkles size={10}/>Crítico!</>:<><Skull size={10}/>Falha Crítica</>}
                </div>
              )}
              <div className="p-3 flex items-center gap-3">
                {/* Selo de cera */}
                <div
                  className={`relative w-14 h-14 rounded-full shrink-0 grid place-items-center ${isCrit?'candle-glow':''} ${isCrit&&isNew?'animate-seal-crit-shake':''}`}
                  style={{
                    background: isCrit
                      ? 'radial-gradient(circle at 35% 30%, #f0d060 0%, #c9a22a 45%, #9c7a2a 100%)'
                      : isFail
                        ? 'radial-gradient(circle at 35% 30%, #8a8272 0%, #5f5a4e 45%, #3d3a30 100%)'
                        : 'radial-gradient(circle at 35% 30%, #b45a3e 0%, rgb(var(--wax)) 40%, rgb(var(--wax-deep)) 100%)',
                    boxShadow: isFail
                      ? 'inset 0 -3px 6px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(0,0,0,0.3)'
                      : '0 8px 20px -6px rgba(0,0,0,0.5), inset 0 -3px 6px rgba(0,0,0,0.25)',
                  }}>
                  <span className={`font-cinzel text-lg font-bold leading-none ${isCrit?'text-ink':'text-parchment'}`}>
                    {roll.total}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-5 h-5 rounded-full bg-purple/60 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                        {roll.rolledBy[0]?.toUpperCase()}
                      </div>
                      <p className="font-cormorant text-[12px] text-saga-muted truncate">{roll.rolledBy}</p>
                      {roll.attribute&&(
                        <span className="text-[10px] text-purple-bright bg-purple-dim border border-purple/20 px-1.5 py-0.5 rounded shrink-0">{roll.attribute}</span>
                      )}
                    </div>
                    <span className="text-[9px] text-saga-dim shrink-0">{timeAgo(roll.rolledAt)}</span>
                  </div>
                  <div className="flex items-center flex-wrap gap-1">
                    <span className="text-[10px] text-saga-dim font-mono">{roll.expression} →</span>
                    {arr.map((n,i)=>(
                      <span key={i} className={`text-[9px] font-mono px-1 rounded ${isCrit?'bg-gold/15 text-gold':isFail?'bg-saga-danger/15 text-saga-danger':'bg-ink/10 text-saga-muted'}`}>{n}</span>
                    ))}
                    {roll.modifier!==0&&(
                      <span className="text-[10px] text-saga-dim font-mono">{roll.modifier>0?'+':''}{roll.modifier}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={chatEndRef}/>
      </div>
    </>
  )
}
