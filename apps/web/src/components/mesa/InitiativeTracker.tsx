import { Swords, ChevronRight, X, Play } from 'lucide-react'
import { Fleuron } from '@/components/landing/Ornament'
import type { InitiativeEntry } from './types'

interface Props {
  initiativeOrder: InitiativeEntry[]
  currentTurnIdx: number
  isGM: boolean
  onRollInitiative: () => void
  onNextTurn: () => void
  onClose: () => void
}

export function InitiativeTracker({ initiativeOrder, currentTurnIdx, isGM, onRollInitiative, onNextTurn, onClose }: Props) {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 w-72 rounded-xl overflow-hidden shadow-2xl bg-bg/[0.97] border border-gold/25 backdrop-blur-md"
      onWheel={e => e.stopPropagation()}>
      <div className="px-4 py-2.5 border-b border-gold/20 flex items-center justify-between bg-gold/[0.06]">
        <div className="flex items-center gap-2">
          <Swords size={12} className="text-gold"/>
          <span className="font-cinzel text-[11px] font-bold text-gold uppercase tracking-widest">Iniciativa</span>
          <Fleuron className="h-2 w-auto text-gold/50" />
          {initiativeOrder.length>0&&(
            <span className="text-[9px] text-saga-dim">
              Turno {(currentTurnIdx%Math.max(1,initiativeOrder.length))+1}/{initiativeOrder.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {isGM&&(
            <button onClick={onRollInitiative}
              className="px-2 py-0.5 rounded text-[9px] font-bold font-cinzel transition-all bg-gold/15 text-gold border border-gold/30">
              Rolar
            </button>
          )}
          {initiativeOrder.length>0&&isGM&&(
            <button onClick={onNextTurn}
              className="px-2 py-0.5 rounded text-[9px] font-bold font-cinzel flex items-center gap-1 transition-all bg-ink/[0.06] text-saga-muted border border-ink/10">
              <ChevronRight size={10}/>Próximo
            </button>
          )}
          <button onClick={onClose} className="text-saga-dim hover:text-saga-text ml-1">
            <X size={13}/>
          </button>
        </div>
      </div>
      <div className="max-h-60 overflow-y-auto">
        {initiativeOrder.length===0?(
          <div className="py-6 text-center">
            <p className="text-[11px] text-saga-dim">Nenhuma ordem de iniciativa.</p>
            {isGM&&<p className="text-[10px] text-saga-dim/60 mt-1">Clique em "Rolar" para sortear.</p>}
          </div>
        ):initiativeOrder.map((entry,i)=>{
          const isCurrent=i===currentTurnIdx%initiativeOrder.length
          const hpPct = entry.hp !== undefined && entry.maxHp && entry.maxHp > 0
            ? Math.max(0, Math.min(100, (entry.hp / entry.maxHp) * 100)) : null
          return (
            <div key={entry.tokenId}
              className="px-4 py-2.5 border-b last:border-0 transition-all"
              style={{
                borderColor:'rgb(var(--ink) / 0.04)',
                background:isCurrent?'rgba(201,162,42,0.08)':'transparent',
              }}>
              <div className="flex items-center gap-3">
                {/* Initiative badge */}
                <div className="w-7 h-7 rounded-full flex items-center justify-center font-cinzel font-bold text-sm shrink-0"
                  style={{
                    background:isCurrent?`${entry.color}30`:'rgb(var(--ink) / 0.05)',
                    border:`1.5px solid ${isCurrent?entry.color:'rgb(var(--ink) / 0.1)'}`,
                    color:isCurrent?entry.color:'#7878a0',
                  }}>
                  {entry.initiative}
                </div>
                {/* Name */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {isCurrent&&<Play className="h-2 w-2 fill-yellow-300 text-yellow-300" />}
                    <span className={`font-cormorant text-[13px] font-medium truncate ${isCurrent?'text-saga-text':'text-saga-muted'}`}>
                      {entry.label}
                    </span>
                  </div>
                  {hpPct !== null && (
                    <div className="mt-1 w-full h-[3px] rounded-full overflow-hidden bg-ink/8">
                      <div className={`h-full rounded-full ${
                        hpPct > 50 ? 'bg-saga-success' : hpPct > 25 ? 'bg-saga-warning' : 'bg-saga-danger'
                      }`} style={{width:`${hpPct}%`}} />
                    </div>
                  )}
                </div>
                {/* HP text */}
                {entry.hp !== undefined && entry.maxHp !== undefined && (
                  <span className={`text-[9px] font-mono shrink-0 ${
                    hpPct && hpPct > 50 ? 'text-green-400' : hpPct && hpPct > 25 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {entry.hp}/{entry.maxHp}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
