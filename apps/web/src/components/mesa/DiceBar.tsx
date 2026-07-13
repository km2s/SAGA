import { type Dispatch, type SetStateAction } from 'react'
import { Send, Minus, Plus, Dice6, X } from 'lucide-react'
import { DICE } from './types'

interface Props {
  chatInput: string
  setChatInput: (v: string) => void
  onSendChat: () => void
  sendingChat: boolean
  activeSessionIsActive: boolean
  rollModifier: number
  setRollModifier: Dispatch<SetStateAction<number>>
  rollingDie: string | null
  onRollDie: (die: string) => void
}

export function DiceBar({
  chatInput, setChatInput, onSendChat, sendingChat, activeSessionIsActive,
  rollModifier, setRollModifier, rollingDie, onRollDie,
}: Props) {
  return (
    <div data-mesa-tutorial="dice" className="shrink-0 border-t border-ink/[0.07] bg-ink/[0.06]">
      <div className="px-3 pt-2.5 pb-1 flex gap-2">
        <input
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSendChat() } }}
          disabled={!activeSessionIsActive || sendingChat}
          placeholder={activeSessionIsActive ? 'Escreva uma mensagem...' : 'Inicie uma sessão para conversar'}
          className="flex-1 rounded px-3 py-2 text-[12px] text-saga-text placeholder:text-saga-dim focus:outline-none focus:border-gold/60 disabled:opacity-40 bg-ink/5 border border-ink/8 transition-colors"
        />
        <button
          onClick={onSendChat}
          disabled={!activeSessionIsActive || !chatInput.trim() || sendingChat}
          className="px-2.5 rounded text-[11px] font-medium text-saga-dim hover:text-saga-text hover:bg-ink/10 disabled:opacity-30 transition-all shrink-0 bg-ink/5">
          <Send size={13}/>
        </button>
      </div>
      <div className="px-3 pb-2.5 pt-1">
        {/* Modifier row */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-[9px] text-saga-dim uppercase tracking-widest font-bold">Rolar Dado</p>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-saga-dim">Mod</span>
            <button onClick={()=>setRollModifier(m=>m-1)}
              className="w-4 h-4 rounded flex items-center justify-center text-saga-dim hover:text-saga-text hover:bg-ink/8 transition-all">
              <Minus size={9}/>
            </button>
            <span className={`text-[10px] font-mono font-bold w-7 text-center ${rollModifier>0?'text-saga-success':rollModifier<0?'text-saga-danger':'text-saga-dim'}`}>
              {rollModifier>=0?'+':''}{rollModifier}
            </span>
            <button onClick={()=>setRollModifier(m=>m+1)}
              className="w-4 h-4 rounded flex items-center justify-center text-saga-dim hover:text-saga-text hover:bg-ink/8 transition-all">
              <Plus size={9}/>
            </button>
            {rollModifier!==0&&(
              <button onClick={()=>setRollModifier(0)}
                className="text-saga-dim hover:text-saga-danger transition-colors ml-0.5"><X size={11} /></button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {DICE.map(die=>{
            const rolling=rollingDie===die
            return (
              <button key={die} onClick={()=>onRollDie(die)}
                disabled={!activeSessionIsActive||!!rollingDie}
                title={`Rolar 1${die}${rollModifier!==0?(rollModifier>0?'+':'')+rollModifier:''}`}
                className={`h-9 rounded flex flex-col items-center justify-center gap-0.5 transition-all select-none border ${
                  !activeSessionIsActive||rollingDie?'opacity-30 cursor-not-allowed':'hover:scale-105 active:scale-95'
                } ${rolling?'bg-gold/15 border-gold/45 ring-1 ring-gold/60':'bg-ink/[0.04] border-ink/8'}`}>
                <Dice6 size={9} className="text-saga-dim"/>
                <span className="text-[10px] font-cinzel font-bold text-gold leading-none">{die}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
