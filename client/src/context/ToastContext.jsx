import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Info, MessageCircle, X } from 'lucide-react'
import { cn } from '../lib/utils'

const ToastContext = createContext(null)
export const useToast = () => useContext(ToastContext)

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info, message: MessageCircle }
const COLORS = {
  success: 'text-emerald-500',
  error: 'text-rose-500',
  info: 'text-brand-500',
  message: 'text-brand-500',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const push = useCallback(
    (type, message, opts = {}) => {
      const id = ++idRef.current
      setToasts((t) => [...t.slice(-3), { id, type, message, title: opts.title, onClick: opts.onClick }])
      setTimeout(() => dismiss(id), opts.duration ?? 4500)
      return id
    },
    [dismiss]
  )

  const api = useMemo(
    () => ({
      success: (m, o) => push('success', m, o),
      error: (m, o) => push('error', m, o),
      info: (m, o) => push('info', m, o),
      message: (m, o) => push('message', m, o),
    }),
    [push]
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-3 top-3 z-[100] flex w-[calc(100vw-1.5rem)] max-w-sm flex-col gap-2 sm:right-5 sm:top-5">
        {toasts.map((t) => {
          const Icon = ICONS[t.type]
          return (
            <div
              key={t.id}
              onClick={() => {
                t.onClick?.()
                dismiss(t.id)
              }}
              className={cn(
                'animate-toast glass shadow-lift pointer-events-auto flex items-start gap-3 rounded-2xl p-3.5 pr-3',
                t.onClick && 'cursor-pointer'
              )}
              role="status"
            >
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', COLORS[t.type])} />
              <div className="min-w-0 flex-1">
                {t.title && <p className="font-display truncate text-[17px] leading-tight">{t.title}</p>}
                <p className="break-words text-sm text-ink/90">{t.message}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  dismiss(t.id)
                }}
                className="rounded-full p-1 text-mute transition hover:bg-soft hover:text-ink"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
