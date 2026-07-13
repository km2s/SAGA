import { type Dispatch, type RefObject, type SetStateAction } from 'react'
import { X, Plus } from 'lucide-react'
import { safeImageUrl } from '@/lib/safe-url'
import { TOKEN_COLORS, type AddTokenState, type NpcData } from './types'

interface Props {
  addToken: AddTokenState
  canvasRef: RefObject<HTMLDivElement>
  isGM: boolean
  npcs: NpcData[]
  onPlaceNpc: (npc: NpcData) => void
  gmCustomOpen: boolean
  setGmCustomOpen: Dispatch<SetStateAction<boolean>>
  newTokenLabel: string
  setNewTokenLabel: (v: string) => void
  newTokenType: 'player' | 'enemy' | 'npc'
  setNewTokenType: (v: 'player' | 'enemy' | 'npc') => void
  newTokenColor: string
  setNewTokenColor: (v: string) => void
  onAddNewToken: () => void
  onClose: () => void
  onCancel: () => void
}

export function AddTokenPopover({
  addToken, canvasRef, isGM, npcs, onPlaceNpc,
  gmCustomOpen, setGmCustomOpen,
  newTokenLabel, setNewTokenLabel,
  newTokenType, setNewTokenType,
  newTokenColor, setNewTokenColor,
  onAddNewToken, onClose, onCancel,
}: Props) {
  return (
    <div className="absolute z-50 rounded-xl border border-border shadow-2xl overflow-hidden bg-surface backdrop-blur-md"
      style={{
        left:Math.min(addToken.screenX+8,(canvasRef.current?.offsetWidth??600)-240),
        top:Math.min(addToken.screenY+8,(canvasRef.current?.offsetHeight??400)-(isGM?320:260)),
        width:236,
      }}
      onMouseDown={e=>e.stopPropagation()}>
      <div className="px-3 py-2.5 border-b border-ink/6 flex items-center justify-between">
        <span className="font-cinzel text-[11px] font-bold text-saga-muted uppercase tracking-widest">
          {isGM?'Colocar Token':'Novo Token'}
        </span>
        <button onClick={onClose} className="text-saga-dim hover:text-saga-text"><X size={14}/></button>
      </div>

      {isGM ? (
        /* ── GM: NPC picker ── */
        <div className="flex flex-col">
          {npcs.length===0 ? (
            <p className="text-[11px] text-saga-dim text-center py-6">Nenhum NPC criado nesta campanha</p>
          ) : (
            <div className="max-h-52 overflow-y-auto p-1.5 flex flex-col gap-0.5">
              {npcs.map(npc=>{
                const tc=npc.type==='ENEMY'||npc.type==='VILLAIN'?'#ef4444':npc.type==='ALLY'?'#22c55e':'#c9a22a'
                const typeLabel=npc.type==='ENEMY'||npc.type==='VILLAIN'?'Inimigo':npc.type==='ALLY'?'Aliado':'Neutro'
                const hpPct=npc.maxHp>0?Math.max(0,Math.min(100,(npc.hp/npc.maxHp)*100)):0
                return (
                  <button key={npc.id} onClick={()=>onPlaceNpc(npc)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-ink/5 transition-all text-left w-full">
                    {safeImageUrl(npc.imageUrl)
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={safeImageUrl(npc.imageUrl)!} alt={npc.name} className="w-7 h-7 rounded-full object-cover shrink-0"/>
                      : <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
                          style={{background:`${tc}22`,border:`1px solid ${tc}55`,color:tc}}>
                          {npc.name[0]?.toUpperCase()??'?'}
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-saga-text truncate leading-tight">{npc.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] font-medium" style={{color:tc}}>{typeLabel}</span>
                        <div className="flex-1 h-[3px] rounded-full overflow-hidden bg-ink/8">
                          <div className={`h-full rounded-full ${hpPct>50?'bg-saga-success':hpPct>25?'bg-saga-warning':'bg-saga-danger'}`} style={{width:`${hpPct}%`}}/>
                        </div>
                        <span className="text-[9px] text-saga-dim shrink-0">{npc.hp}/{npc.maxHp}</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
          {/* Custom token fallback */}
          <div className="border-t border-ink/6">
            <button onClick={()=>setGmCustomOpen(o=>!o)}
              className="w-full px-3 py-2 text-[10px] text-saga-dim hover:text-saga-text transition-colors flex items-center justify-center gap-1">
              <Plus size={10}/> Token Personalizado
            </button>
            {gmCustomOpen&&(
              <div className="p-2.5 pt-0 flex flex-col gap-2">
                <input autoFocus value={newTokenLabel} onChange={e=>setNewTokenLabel(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter')onAddNewToken();if(e.key==='Escape')onCancel()}}
                  placeholder="Nome do token..."
                  className="w-full px-2 py-1.5 rounded text-xs text-saga-text placeholder:text-saga-dim focus:outline-none bg-ink/5 border border-ink/10 focus:border-gold/60 transition-colors"/>
                <div className="flex gap-1">
                  {(['player','enemy','npc'] as const).map(tp=>(
                    <button key={tp} onClick={()=>setNewTokenType(tp)}
                      className={`flex-1 py-1 rounded text-[9px] font-medium uppercase transition-all border ${
                        newTokenType===tp
                          ? tp==='player' ? 'bg-purple/40 border-purple/60 text-white'
                            : tp==='enemy' ? 'bg-saga-danger/40 border-saga-danger/50 text-white'
                            : 'bg-gold/30 border-gold/50 text-white'
                          : 'bg-ink/[0.04] border-ink/8 text-saga-dim'
                      }`}>
                      {tp==='player'?'Jogador':tp==='enemy'?'Inimigo':'NPC'}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1 flex-wrap">
                  {TOKEN_COLORS.map(c=>(
                    <button key={c} onClick={()=>setNewTokenColor(c)} className="w-4 h-4 rounded-full transition-all"
                      style={{background:c,boxShadow:newTokenColor===c?'0 0 0 2px rgb(var(--ink) / 0.9)':'none',transform:newTokenColor===c?'scale(1.2)':'scale(1)'}}/>
                  ))}
                </div>
                <button onClick={onAddNewToken}
                  className="w-full py-1.5 rounded text-[11px] font-bold text-bg font-cinzel bg-gradient-gold">
                  Colocar no Mapa
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Jogador: form genérico ── */
        <div className="p-3 flex flex-col gap-3">
          <input autoFocus value={newTokenLabel} onChange={e=>setNewTokenLabel(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter')onAddNewToken();if(e.key==='Escape')onCancel()}}
            placeholder="Nome do token..."
            className="w-full px-3 py-2 rounded text-sm text-saga-text placeholder:text-saga-dim focus:outline-none bg-ink/5 border border-ink/10 focus:border-gold/60 transition-colors"/>
          <div className="flex gap-1.5">
            {(['player','enemy','npc'] as const).map(tp=>(
              <button key={tp} onClick={()=>setNewTokenType(tp)}
                className={`flex-1 py-1.5 rounded text-[10px] font-medium uppercase transition-all border ${
                  newTokenType===tp
                    ? tp==='player' ? 'bg-purple/40 border-purple/60 text-white'
                      : tp==='enemy' ? 'bg-saga-danger/40 border-saga-danger/50 text-white'
                      : 'bg-gold/30 border-gold/50 text-white'
                    : 'bg-ink/[0.04] border-ink/8 text-saga-dim'
                }`}>
                {tp==='player'?'Jogador':tp==='enemy'?'Inimigo':'NPC'}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {TOKEN_COLORS.map(c=>(
              <button key={c} onClick={()=>setNewTokenColor(c)} className="w-5 h-5 rounded-full transition-all"
                style={{background:c,boxShadow:newTokenColor===c?'0 0 0 2px rgb(var(--ink) / 0.9)':'none',transform:newTokenColor===c?'scale(1.2)':'scale(1)'}}/>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{background:newTokenColor}}>
              {(newTokenLabel[0]??'?').toUpperCase()}
            </div>
            <button onClick={onAddNewToken}
              className="flex-1 py-1.5 rounded text-[11px] font-bold text-bg font-cinzel bg-gradient-gold">
              Colocar no Mapa
            </button>
          </div>
          <p className="text-[9px] text-saga-dim text-center">Clique direito no token para remover</p>
        </div>
      )}
    </div>
  )
}
