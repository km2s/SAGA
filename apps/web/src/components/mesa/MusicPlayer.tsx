'use client'

import { useState } from 'react'
import { Coffee, Skull, Leaf, Swords, Crown, Sparkles, Music, X, Square, Play } from 'lucide-react'

interface Track {
  id: string
  title: string
  mood: string
  youtubeId: string
  Icon: React.ElementType
}

const PRESETS: Track[] = [
  { id: 'tavern',   title: 'Taverna Medieval',      mood: 'Relaxante',  youtubeId: 'Wr5RFkh_h5I', Icon: Coffee  },
  { id: 'dungeon',  title: 'Masmorra Sombria',       mood: 'Tenso',      youtubeId: 'wpCbJWFmJRQ', Icon: Skull   },
  { id: 'forest',   title: 'Floresta Encantada',     mood: 'Misterioso', youtubeId: 'V4zjSjgfOZY', Icon: Leaf    },
  { id: 'battle',   title: 'Batalha Épica',          mood: 'Intenso',    youtubeId: 'CKU4U6VhEVg', Icon: Swords  },
  { id: 'castle',   title: 'Salão do Rei',           mood: 'Grandioso',  youtubeId: 'T2dJ1hJ7f-U', Icon: Crown   },
  { id: 'mystery',  title: 'Mistério Arcano',        mood: 'Sombrio',    youtubeId: 'XLg7SiXzjl0', Icon: Sparkles},
]

interface MusicPlayerProps {
  open: boolean
  onClose: () => void
  onMusicChange: (youtubeId: string | null, volume: number) => void
}

export function MusicPlayer({ open, onClose, onMusicChange }: MusicPlayerProps) {
  const [current, setCurrent] = useState<Track | null>(null)
  const [volume, setVolume] = useState(50)
  const [playing, setPlaying] = useState(false)
  const [customUrl, setCustomUrl] = useState('')

  function extractYouTubeId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    ]
    for (const p of patterns) {
      const m = url.match(p)
      if (m?.[1]) return m[1]
    }
    return null
  }

  function playTrack(track: Track) {
    setCurrent(track)
    setPlaying(true)
    setCustomUrl('')
    onMusicChange(track.youtubeId, volume)
  }

  function playCustom() {
    const ytId = extractYouTubeId(customUrl)
    if (ytId) {
      const track: Track = { id: 'custom', title: 'Personalizado', mood: 'Custom', youtubeId: ytId, Icon: Music }
      setCurrent(track)
      setPlaying(true)
      onMusicChange(ytId, volume)
    }
  }

  function stopMusic() {
    setCurrent(null)
    setPlaying(false)
    onMusicChange(null, volume)
  }

  const embedSrc = current
    ? `https://www.youtube.com/embed/${current.youtubeId}?autoplay=1&loop=1&playlist=${current.youtubeId}&controls=0&disablekb=1&modestbranding=1`
    : null

  return (
    <>
      {/* Iframe persists even when modal is closed so music keeps playing */}
      {embedSrc && (
        <iframe
          key={embedSrc}
          src={embedSrc}
          allow="autoplay"
          className="w-0 h-0 fixed opacity-0 pointer-events-none"
          title="music"
        />
      )}
      {!open ? null : (
    <div className="fixed inset-0 z-[200] flex items-end justify-center pb-8" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl border border-border shadow-2xl overflow-hidden"
           style={{ background: 'rgba(13,13,26,0.98)' }}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full transition-all ${playing ? 'bg-saga-success animate-pulse' : 'bg-saga-dim'}`} />
            <span className="font-cinzel text-sm font-semibold flex items-center gap-2">
              {current ? <><current.Icon size={14} />{current.title}</> : <><Music size={14} />Música Ambiente</>}
            </span>
          </div>
          <button onClick={onClose} className="text-saga-dim hover:text-saga-text transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Now playing strip */}
        {current && (
          <div className="px-5 py-3 border-b border-white/6 flex items-center gap-3"
               style={{ background: 'rgba(201,162,42,0.05)' }}>
            <current.Icon size={22} className="text-saga-muted shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-saga-text truncate">{current.title}</p>
              <p className="text-[11px] text-saga-muted">{current.mood}</p>
            </div>
            <button onClick={stopMusic}
              className="px-2.5 py-1 rounded text-[11px] text-saga-danger border border-saga-danger/30 hover:bg-saga-danger/10 transition-colors flex items-center gap-1">
              <Square size={10} />Parar
            </button>
          </div>
        )}

        {/* Presets grid */}
        <div className="p-4">
          <p className="text-[10px] font-bold text-saga-dim uppercase tracking-widest mb-3">Ambientes</p>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map(track => (
              <button key={track.id} onClick={() => playTrack(track)}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                  current?.id === track.id
                    ? 'border-gold/50 bg-gold/10 text-gold'
                    : 'border-white/8 hover:border-white/16 hover:bg-white/4 text-saga-muted hover:text-saga-text'
                }`}>
                <track.Icon size={22} />
                <div className="text-center">
                  <p className="text-[11px] font-medium leading-tight">{track.title}</p>
                  <p className="text-[9px] opacity-60 mt-0.5">{track.mood}</p>
                </div>
                {current?.id === track.id && (
                  <div className="flex gap-0.5">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-0.5 bg-gold rounded-full animate-bounce"
                           style={{ height: `${8 + i * 3}px`, animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Custom URL */}
        <div className="px-4 pb-4 border-t border-white/6 pt-4">
          <p className="text-[10px] font-bold text-saga-dim uppercase tracking-widest mb-2">URL do YouTube</p>
          <div className="flex gap-2">
            <input value={customUrl} onChange={e => setCustomUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && playCustom()}
              placeholder="https://youtube.com/watch?v=..."
              className="flex-1 px-3 py-2 rounded text-[12px] text-saga-text placeholder:text-saga-dim focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }} />
            <button onClick={playCustom} disabled={!customUrl.trim()}
              className="px-3 py-2 rounded text-[11px] font-bold text-bg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #c9a22a, #f0d060)' }}>
              <Play size={12} />
            </button>
          </div>
          <p className="text-[9px] text-saga-dim mt-1.5">Cole um link do YouTube (trilha, ambient, lofi, etc.)</p>
        </div>
      </div>
    </div>
      )}
    </>
  )
}
