import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

export default function Modal({ open, onClose, title, subtitle, children, footer, size = 'md', bare = false }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  const width = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-xl', xl: 'sm:max-w-3xl' }[size]

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="animate-fade absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'animate-pop shadow-lift relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-card sm:rounded-3xl',
          width
        )}
      >
        {!bare && (
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
            <div className="min-w-0">
              <h2 className="truncate text-2xl leading-tight">{title}</h2>
              {subtitle && <p className="mt-0.5 text-sm text-mute">{subtitle}</p>}
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-mute transition hover:bg-soft hover:text-ink" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className={cn('scroll-thin min-h-0 flex-1 overflow-y-auto', !bare && 'px-6 py-5')}>{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line bg-soft/40 px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}
