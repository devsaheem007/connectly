import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

export function Spinner({ className }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-brand-500', className)} />
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center gap-5 bg-paper">
      <Logo size="lg" spin />
      <p className="font-display text-xl text-mute">{label}</p>
    </div>
  )
}

export function Logo({ size = 'md', spin = false, withText = false, className }) {
  const px = { sm: 30, md: 38, lg: 56 }[size]
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="relative inline-flex" style={{ width: px, height: px }}>
        {spin && <span className="absolute inset-0 animate-ping rounded-2xl bg-brand-500/30" />}
        <svg viewBox="0 0 64 64" width={px} height={px} className="relative drop-shadow-md">
          <defs>
            <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--brand-500)" />
              <stop offset="1" stopColor="var(--brand-alt)" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="18" fill="url(#lg)" />
          <path d="M20 24c0-3.3 2.7-6 6-6h12c3.3 0 6 2.7 6 6v10c0 3.3-2.7 6-6 6h-6l-7 6v-6c-3 0-5-2.7-5-6V24z" fill="#fff" />
          <circle cx="27" cy="29" r="2.2" fill="var(--brand-500)" />
          <circle cx="32" cy="29" r="2.2" fill="var(--brand-500)" />
          <circle cx="37" cy="29" r="2.2" fill="var(--brand-500)" />
        </svg>
      </span>
      {withText && <span className="font-display text-[28px] leading-none tracking-tight">Connectly</span>}
    </span>
  )
}

export function Toggle({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300 disabled:opacity-50', checked ? 'bg-brand-gradient' : 'bg-line')}
    >
      <span className={cn('absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-300', checked && 'translate-x-5')} />
    </button>
  )
}

export function EmptyState({ icon: Icon, title, text, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      {Icon && (
        <div className="relative mb-5">
          <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/10" style={{ animationDuration: '3s' }} />
          <span className="bg-brand-gradient-soft relative flex h-20 w-20 items-center justify-center rounded-full border border-brand-500/15">
            <Icon className="h-9 w-9 text-brand-500" strokeWidth={1.6} />
          </span>
        </div>
      )}
      <h3 className="text-3xl">{title}</h3>
      {text && <p className="mt-2 max-w-xs text-sm leading-relaxed text-mute">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ListSkeleton({ rows = 7 }) {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl p-3">
          <div className="skeleton h-11 w-11 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 w-1/2 rounded-full" />
            <div className="skeleton h-3 w-4/5 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function Badge({ children, tone = 'brand', className }) {
  const tones = {
    brand: 'bg-brand-500/12 text-brand-700 dark:text-brand-300',
    green: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400',
    red: 'bg-rose-500/12 text-rose-700 dark:text-rose-400',
    amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    gray: 'bg-soft text-mute',
  }
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold italic', tones[tone], className)}>{children}</span>
}

export function Dropdown({ open, onClose, children, className, align = 'right' }) {
  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className={cn(
          'animate-pop glass shadow-lift absolute z-50 mt-2 min-w-48 origin-top overflow-hidden rounded-2xl p-1.5',
          align === 'right' ? 'right-0' : 'left-0',
          className
        )}
      >
        {children}
      </div>
    </>
  )
}

export function MenuItem({ icon: Icon, children, onClick, danger, active }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition',
        danger ? 'text-rose-600 hover:bg-rose-500/10 dark:text-rose-400' : 'text-ink hover:bg-soft',
        active && 'bg-brand-500/10 text-brand-600'
      )}
    >
      {Icon && <Icon className="h-[17px] w-[17px] shrink-0 opacity-80" />}
      {children}
    </button>
  )
}
