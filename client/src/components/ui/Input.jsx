import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '../../lib/utils'

const Input = forwardRef(function Input({ label, icon: Icon, error, hint, type = 'text', className, wrapperClassName, ...rest }, ref) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  return (
    <label className={cn('block', wrapperClassName)}>
      {label && <span className="mb-1.5 block text-[13px] font-semibold italic text-ink/80">{label}</span>}
      <span className="relative block">
        {Icon && <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-mute" />}
        <input
          ref={ref}
          type={isPassword && show ? 'text' : type}
          className={cn(
            'h-12 w-full rounded-xl border bg-card px-4 text-[15px] text-ink outline-none transition placeholder:text-mute/70',
            'focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15',
            Icon && 'pl-11',
            isPassword && 'pr-12',
            error ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-500/15' : 'border-line',
            className
          )}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShow((s) => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-mute transition hover:bg-soft hover:text-ink"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        )}
      </span>
      {error ? <span className="mt-1.5 block text-xs font-medium text-rose-500">{error}</span> : hint ? <span className="mt-1.5 block text-xs text-mute">{hint}</span> : null}
    </label>
  )
})

export default Input

export const Textarea = forwardRef(function Textarea({ label, error, hint, className, wrapperClassName, ...rest }, ref) {
  return (
    <label className={cn('block', wrapperClassName)}>
      {label && <span className="mb-1.5 block text-[13px] font-semibold italic text-ink/80">{label}</span>}
      <textarea
        ref={ref}
        className={cn(
          'min-h-24 w-full resize-none rounded-xl border bg-card px-4 py-3 text-[15px] text-ink outline-none transition placeholder:text-mute/70',
          'focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15',
          error ? 'border-rose-400' : 'border-line',
          className
        )}
        {...rest}
      />
      {error ? <span className="mt-1.5 block text-xs font-medium text-rose-500">{error}</span> : hint ? <span className="mt-1.5 block text-xs text-mute">{hint}</span> : null}
    </label>
  )
})
