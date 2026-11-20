import { useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, MessageCircle, Moon, Settings, ShieldCheck, Sun } from 'lucide-react'
import Avatar from '../components/ui/Avatar'
import { Logo } from '../components/ui/misc'
import ConversationList from '../components/chat/ConversationList'
import { ChatProvider, useChat } from '../context/ChatContext'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { cn } from '../lib/utils'

function RailLink({ to, icon: Icon, label, badge, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={label}
      data-cursor={label}
      className={({ isActive }) =>
        cn(
          'relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200 max-md:h-11 max-md:w-auto max-md:flex-1 max-md:rounded-xl',
          isActive ? 'bg-brand-gradient shadow-glow text-white' : 'text-mute hover:bg-soft hover:text-ink'
        )
      }
    >
      <Icon className="h-[22px] w-[22px]" />
      {badge > 0 && (
        <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-card">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  )
}

function Shell() {
  const { user, logout } = useAuth()
  const { totalUnread } = useChat()
  const { dark, toggle } = useTheme()
  const loc = useLocation()
  const nav = useNavigate()
  const atRoot = loc.pathname === '/app' || loc.pathname === '/app/'
  const inChat = loc.pathname.startsWith('/app/c/')
  const staff = user.role === 'admin' || user.role === 'moderator'

  // keep the visual viewport height correct on mobile browsers with dynamic toolbars
  useEffect(() => {
    const set = () => document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`)
    set()
    window.addEventListener('resize', set)
    return () => window.removeEventListener('resize', set)
  }, [])

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-paper">
      {/* left rail (desktop) / bottom bar (mobile) */}
      <nav
        className={cn(
          'z-30 flex shrink-0 border-line bg-card/90 backdrop-blur-xl',
          'md:w-[4.75rem] md:flex-col md:items-center md:border-r md:py-5',
          'max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:items-center max-md:gap-1 max-md:border-t max-md:px-3 max-md:py-2 max-md:pb-[max(0.5rem,env(safe-area-inset-bottom))]',
          inChat && 'max-md:hidden'
        )}
      >
        <button onClick={() => nav('/')} className="mb-6 hidden md:block" aria-label="Home" data-cursor="Home">
          <Logo size="md" />
        </button>
        <div className="flex gap-2 md:flex-col max-md:w-full max-md:items-center">
          <RailLink to="/app" end icon={MessageCircle} label="Chats" badge={totalUnread} />
          <RailLink to="/app/settings" icon={Settings} label="Settings" />
          {staff && <RailLink to="/app/admin" icon={ShieldCheck} label="Admin" />}
          <button onClick={toggle} className="hidden h-12 w-12 items-center justify-center rounded-2xl text-mute transition hover:bg-soft hover:text-ink max-md:flex max-md:h-11 max-md:w-auto max-md:flex-1" aria-label="Toggle theme">
            {dark ? <Sun className="h-[22px] w-[22px]" /> : <Moon className="h-[22px] w-[22px]" />}
          </button>
        </div>

        <div className="mt-auto hidden flex-col items-center gap-2 md:flex">
          <button onClick={toggle} className="flex h-12 w-12 items-center justify-center rounded-2xl text-mute transition hover:bg-soft hover:text-ink" aria-label="Toggle theme" data-cursor={dark ? 'Light' : 'Dark'}>
            {dark ? <Sun className="h-[22px] w-[22px]" /> : <Moon className="h-[22px] w-[22px]" />}
          </button>
          <button onClick={logout} className="flex h-12 w-12 items-center justify-center rounded-2xl text-mute transition hover:bg-rose-500/10 hover:text-rose-500" aria-label="Log out" title="Log out" data-cursor="Log out">
            <LogOut className="h-[22px] w-[22px]" />
          </button>
          <NavLink to="/app/settings" className="mt-1" title={user.name}>
            <Avatar src={user.avatar} name={user.name} size="md" online />
          </NavLink>
        </div>
      </nav>

      {/* conversation list */}
      <aside
        className={cn(
          'min-h-0 w-full shrink-0 border-r border-line bg-card md:w-[21rem] lg:w-[24rem]',
          atRoot ? 'block' : 'hidden md:block'
        )}
      >
        <ConversationList />
      </aside>

      {/* main pane */}
      <main className={cn('min-w-0 flex-1 bg-paper', atRoot ? 'hidden md:block' : 'block', !inChat && 'max-md:pb-[4.5rem]')}>
        <Outlet />
      </main>
    </div>
  )
}

export default function AppShell() {
  return (
    <ChatProvider>
      <Shell />
    </ChatProvider>
  )
}
