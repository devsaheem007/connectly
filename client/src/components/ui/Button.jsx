import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

const VARIANTS = {
  primary: 'bg-brand-gradient text-white shadow-glow hover:brightness-110 active:brightness-95',
  secondary: 'bg-soft text-ink hover:bg-line/70',
  outline: 'border border-line bg-card text-ink hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-brand-500/10',
  ghost: 'text-mute hover:bg-soft hover:text-ink',
  danger: 'bg-rose-500 text-white hover:bg-rose-600',
  dangerSoft: 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/15 dark:text-rose-400',
}
const SIZES = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-13 px-7 text-base gap-2.5',
  icon: 'h-10 w-10',
}

export default function Button({ variant = 'primary', size = 'md', loading, icon: Icon, className, children, disabled, as: Tag = 'button', ...rest }) {
  return (
    <Tag
      className={cn(
        'relative inline-flex select-none items-center justify-center rounded-xl font-semibold transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-55',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-[18px] w-[18px]" /> : null}
      {children}
    </Tag>
  )
}
