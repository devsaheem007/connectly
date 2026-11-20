import { Link } from 'react-router-dom'
import { Check, Lock, Zap } from 'lucide-react'
import { Logo } from './ui/misc'
import { useTheme } from '../context/ThemeContext'
import { Moon, Sun } from 'lucide-react'

const POINTS = [
  { icon: Zap, text: 'Messages arrive the instant they are sent' },
  { icon: Lock, text: 'HTTP-only sessions, hashed passwords, rate-limited logins' },
  { icon: Check, text: 'Read receipts, reactions, groups and file sharing' },
]

/** Split-screen frame shared by login, register, OTP and reset pages. */
export default function AuthShell({ title, subtitle, children, footer }) {
  const { dark, toggle } = useTheme()
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* brand panel */}
      <aside className="relative hidden overflow-hidden bg-brand-gradient lg:block noise">
        <div className="animate-blob absolute -left-24 -top-24 h-96 w-96 bg-white/15 blur-2xl" />
        <div className="animate-blob absolute -bottom-32 right-0 h-[28rem] w-[28rem] bg-black/15 blur-3xl" style={{ animationDelay: '-6s' }} />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Link to="/" className="inline-flex items-center gap-3">
            <Logo size="md" />
            <span className="font-display text-3xl">Connectly</span>
          </Link>

          <div className="max-w-md">
            <h2 className="text-[56px] leading-[1.02]">Conversations, <br /> beautifully connected.</h2>
            <ul className="mt-9 space-y-4">
              {POINTS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-[15px] text-white/90">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* floating bubbles */}
          <div className="pointer-events-none absolute right-10 top-28 w-64 space-y-3">
            <div className="animate-float glass rounded-2xl rounded-bl-sm p-3 text-sm text-ink shadow-lift">Did you ship it? 🚀</div>
            <div className="animate-float ml-10 rounded-2xl rounded-br-sm bg-white p-3 text-sm text-ink shadow-lift" style={{ animationDelay: '-2s' }}>
              Just now — check your inbox ✨
            </div>
          </div>

          <p className="text-sm text-white/70">© {new Date().getFullYear()} Connectly. Built with care.</p>
        </div>
      </aside>

      {/* form */}
      <main className="relative flex min-h-dvh flex-col">
        <div className="flex items-center justify-between p-5 sm:p-7">
          <Link to="/" className="lg:hidden">
            <Logo size="sm" withText />
          </Link>
          <span className="hidden lg:block" />
          <button onClick={toggle} className="rounded-full border border-line bg-card p-2.5 text-mute transition hover:text-ink" aria-label="Toggle theme">
            {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-10 sm:px-8">
          <div className="animate-slide-up w-full max-w-[26rem]">
            <h1 className="text-[44px] leading-[1.05] sm:text-5xl">{title}</h1>
            {subtitle && <p className="mt-3 text-[15px] leading-relaxed text-mute">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-7 text-center text-sm text-mute">{footer}</div>}
          </div>
        </div>
      </main>
    </div>
  )
}

export const Divider = ({ children = 'or' }) => (
  <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-mute">
    <span className="h-px flex-1 bg-line" />
    {children}
    <span className="h-px flex-1 bg-line" />
  </div>
)

export const FormError = ({ children }) =>
  children ? <div className="animate-pop mb-4 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-600 dark:text-rose-400">{children}</div> : null
