import { useState } from 'react'
import { EMOJI_GROUPS } from '../../lib/emoji'
import { cn } from '../../lib/utils'

export default function EmojiPicker({ onPick, className }) {
  const [tab, setTab] = useState(0)
  return (
    <div className={cn('animate-pop glass shadow-lift w-[19.5rem] overflow-hidden rounded-3xl', className)}>
      <div className="flex border-b border-line px-2 pt-1.5">
        {EMOJI_GROUPS.map((g, i) => (
          <button
            key={g.name}
            onClick={() => setTab(i)}
            title={g.name}
            className={cn('flex-1 rounded-t-xl py-2 text-lg transition', tab === i ? 'bg-brand-500/10' : 'opacity-60 hover:opacity-100')}
          >
            {g.icon}
          </button>
        ))}
      </div>
      <p className="px-4 pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-mute">{EMOJI_GROUPS[tab].name}</p>
      <div className="scroll-thin grid h-48 grid-cols-8 content-start gap-0.5 overflow-y-auto px-2.5 pb-3">
        {EMOJI_GROUPS[tab].emojis.map((e, i) => (
          <button key={`${e}${i}`} onClick={() => onPick(e)} className="rounded-lg p-1 text-[22px] leading-none transition hover:scale-125 hover:bg-soft">
            {e}
          </button>
        ))}
      </div>
    </div>
  )
}
