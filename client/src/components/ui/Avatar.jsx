import { useState } from 'react'
import { Users } from 'lucide-react'
import { assetUrl } from '../../lib/api'
import { cn, gradientFor, initials } from '../../lib/utils'

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-24 w-24 text-2xl',
  '2xl': 'h-32 w-32 text-3xl',
}
const DOTS = { xs: 'h-2 w-2', sm: 'h-2.5 w-2.5', md: 'h-3 w-3', lg: 'h-3.5 w-3.5', xl: 'h-4 w-4', '2xl': 'h-5 w-5' }

export default function Avatar({ src, name = '', size = 'md', online, group = false, className }) {
  const [broken, setBroken] = useState(false)
  const url = assetUrl(src)
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <span
        className={cn('font-display inline-flex select-none items-center justify-center overflow-hidden rounded-full italic text-white', SIZES[size])}
        style={!url || broken ? { backgroundImage: gradientFor(name) } : undefined}
        aria-label={name}
      >
        {url && !broken ? (
          <img src={url} alt={name} className="h-full w-full object-cover" onError={() => setBroken(true)} draggable={false} />
        ) : group ? (
          <Users className="h-[48%] w-[48%]" strokeWidth={2} />
        ) : (
          initials(name)
        )}
      </span>
      {online !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-card transition-colors duration-300',
            DOTS[size],
            online ? 'bg-emerald-500' : 'hidden'
          )}
        />
      )}
    </span>
  )
}
