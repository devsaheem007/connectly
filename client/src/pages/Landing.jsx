import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Bell, CheckCheck, FileUp, Globe2, Lock, MessageCircle, Moon, ShieldCheck, Smile, Sparkles, Sun, Users, Zap,
} from 'lucide-react'
import Reveal, { SplitWords } from '../components/fx/Reveal'
import Tilt from '../components/fx/Tilt'
import Magnetic from '../components/fx/Magnetic'
import ScrollProgress from '../components/fx/ScrollProgress'
import Button from '../components/ui/Button'
import { Logo } from '../components/ui/misc'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useCountUp, useReveal } from '../hooks/useReveal'

const FEATURES = [
  { icon: Zap, title: 'Truly real-time', text: 'Socket.IO delivers messages, typing indicators and presence in milliseconds.' },
  { icon: CheckCheck, title: 'Receipts that make sense', text: 'Sent, delivered and read states, so you always know where a message stands.' },
  { icon: Users, title: 'Groups with roles', text: 'Create groups, promote admins, add or remove members and keep everyone in sync.' },
  { icon: FileUp, title: 'Share anything', text: 'Photos, videos, documents and audio, with inline previews and safe downloads.' },
  { icon: Smile, title: 'Reactions & replies', text: 'React with emoji, reply in context, edit, delete or forward any message.' },
  { icon: ShieldCheck, title: 'Security first', text: 'HTTP-only cookie sessions, hashed passwords, email OTP and rate limiting.' },
  { icon: Bell, title: 'Smart notifications', text: 'Browser alerts, sounds and unread counters, all configurable per person.' },
  { icon: Globe2, title: 'Built for every screen', text: 'A fluid layout that feels native on desktop, tablet and phone.' },
]

const STEPS = [
  { n: '01', title: 'Create your account', text: 'Sign up with email or Google and confirm with a one-time code.' },
  { n: '02', title: 'Find your people', text: 'Search by name or username and start a conversation instantly.' },
  { n: '03', title: 'Chat without limits', text: 'Send messages, files and reactions in real time, on any device.' },
]

const QUOTES = [
  ['"The cleanest chat app I have used. The italics make it feel like a magazine."', 'Aisha K.', 'Product designer'],
  ['"Messages land instantly, and the read receipts are exactly right."', 'Hamza A.', 'Engineering lead'],
  ['"We moved our whole team over in an afternoon. Groups just work."', 'Sara M.', 'Operations'],
]

const MARQUEE = ['Instant delivery', 'Read receipts', 'Group chats', 'File sharing', 'Dark mode', 'Reactions', 'Typing indicators', 'Pinned chats', 'Message search', 'Admin tools']

function Stat({ end, suffix = '', label }) {
  const [ref, shown] = useReveal()
  const v = useCountUp(end, shown)
  return (
    <div ref={ref} className="text-center">
      <div className="font-display text-6xl text-gradient sm:text-7xl">
        {v.toLocaleString()}
        {suffix}
      </div>
      <p className="mt-1 text-sm font-medium text-mute">{label}</p>
    </div>
  )
}

function HeroMockup() {
  const lines = [
    { me: false, t: 'Hey! Is the new design ready?' },
    { me: true, t: 'Shipping it today 🚀' },
    { me: false, t: 'Amazing. Reacting with ❤️' },
  ]
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (count >= lines.length + 1) return
    const t = setTimeout(() => setCount((c) => c + 1), count === 0 ? 900 : 1400)
    return () => clearTimeout(t)
  }, [count, lines.length])

  return (
    <Tilt className="group mx-auto w-full max-w-md rounded-[2rem]" max={6}>
      <div className="glass shadow-lift overflow-hidden rounded-[2rem]">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className="font-display flex h-11 w-11 items-center justify-center rounded-full bg-brand-gradient text-lg text-white">A</span>
          <div className="flex-1">
            <p className="font-display text-xl leading-none">Aisha Khan</p>
            <p className="mt-1 text-xs font-medium text-emerald-500">● online</p>
          </div>
        </div>
        <div className="chat-bg min-h-72 space-y-3 p-5">
          {lines.slice(0, count).map((l, i) => (
            <div key={i} className={`animate-slide-up flex ${l.me ? 'justify-end' : ''}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-soft ${l.me ? 'rounded-br-sm bg-brand-gradient text-white' : 'rounded-bl-sm bg-card'}`}>
                {l.t}
                {l.me && <CheckCheck className="ml-2 inline h-3.5 w-3.5 text-white/80" />}
              </div>
            </div>
          ))}
          {count > 0 && count < lines.length + 1 && (
            <div className="flex">
              <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-card px-4 py-3 shadow-soft">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-mute" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 border-t border-line px-5 py-3.5">
          <span className="flex-1 rounded-full bg-soft px-4 py-2.5 text-sm text-mute">Write a message…</span>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-white">
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Tilt>
  )
}

export default function Landing() {
  const { user } = useAuth()
  const { dark, toggle } = useTheme()
  const heroRef = useRef(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // parallax for background orbs + spotlight following the pointer
  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    const onScroll = () => el.style.setProperty('--sy', `${window.scrollY}`)
    const onMove = (e) => {
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${e.clientX - r.left}px`)
      el.style.setProperty('--my', `${e.clientY - r.top}px`)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    el.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('scroll', onScroll)
      el.removeEventListener('mousemove', onMove)
    }
  }, [])

  const cta = user ? (
    <Button as={Link} to="/app" size="lg" icon={MessageCircle} data-cursor="Open">
      Open Connectly
    </Button>
  ) : (
    <Button as={Link} to="/register" size="lg" data-cursor="Join">
      Get started free <ArrowRight className="h-4 w-4" />
    </Button>
  )

  return (
    <div className="relative overflow-x-clip">
      <ScrollProgress />

      {/* nav */}
      <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? 'py-2' : 'py-4'}`}>
        <div className={`mx-auto flex max-w-6xl items-center justify-between rounded-full px-4 py-2.5 transition-all duration-300 sm:px-6 ${scrolled ? 'glass shadow-soft mx-3 sm:mx-auto' : 'mx-3 sm:mx-auto'}`}>
          <Link to="/"><Logo size="sm" withText /></Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-mute md:flex">
            <a href="#features" className="transition hover:text-ink">Features</a>
            <a href="#how" className="transition hover:text-ink">How it works</a>
            <a href="#loved" className="transition hover:text-ink">Reviews</a>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="rounded-full p-2.5 text-mute transition hover:bg-soft hover:text-ink" aria-label="Toggle theme">
              {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
            {user ? (
              <Button as={Link} to="/app" size="sm">Open app</Button>
            ) : (
              <>
                <Button as={Link} to="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">Log in</Button>
                <Button as={Link} to="/register" size="sm">Sign up</Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* hero */}
      <section ref={heroRef} className="relative isolate px-5 pb-24 pt-36 sm:pt-44">
        <div className="spotlight pointer-events-none absolute inset-0 -z-10" style={{ '--mx': 'var(--mx)', '--my': 'var(--my)' }} />
        <div className="animate-blob pointer-events-none absolute -left-32 top-10 -z-10 h-96 w-96 bg-brand-500/20 blur-3xl" style={{ transform: 'translateY(calc(var(--sy, 0) * 0.15px))' }} />
        <div className="animate-blob pointer-events-none absolute -right-24 top-60 -z-10 h-[26rem] w-[26rem] bg-brand-alt/20 blur-3xl" style={{ animationDelay: '-7s' }} />

        <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <Reveal variant="blur">
              <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-semibold italic">
                <Sparkles className="h-4 w-4 text-brand-500" /> Real-time messaging, reimagined
              </span>
            </Reveal>
            <h1 className="mt-6 text-[56px] leading-[0.98] sm:text-7xl lg:text-[88px]">
              <SplitWords text="Say it now." delay={100} />
              <br />
              <SplitWords text="Feel it connect." wordClassName="text-gradient" delay={450} />
            </h1>
            <Reveal delay={500} variant="up">
              <p className="mt-7 max-w-lg text-lg leading-relaxed text-mute">
                Connectly is a modern messaging platform with instant delivery, expressive reactions, powerful group chats and a design that feels like a magazine.
              </p>
            </Reveal>
            <Reveal delay={650} variant="up" className="mt-9 flex flex-wrap items-center gap-3">
              <Magnetic>{cta}</Magnetic>
              {!user && (
                <Button as={Link} to="/login" variant="outline" size="lg">
                  I have an account
                </Button>
              )}
            </Reveal>
            <Reveal delay={800} variant="up" className="mt-10 flex items-center gap-4 text-sm text-mute">
              <div className="flex -space-x-2.5">
                {['#6366f1', '#ec4899', '#10b981', '#f59e0b'].map((c, i) => (
                  <span key={i} className="font-display flex h-9 w-9 items-center justify-center rounded-full text-sm text-white ring-2 ring-paper" style={{ background: c }}>
                    {'ASHB'[i]}
                  </span>
                ))}
              </div>
              <span>Loved by teams who care about great conversations</span>
            </Reveal>
          </div>
          <Reveal variant="zoom" delay={300}>
            <HeroMockup />
          </Reveal>
        </div>
      </section>

      {/* marquee */}
      <div className="border-y border-line bg-card/50 py-5">
        <div className="relative flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
          <div className="animate-marquee flex w-max shrink-0 gap-12 pr-12">
            {[...MARQUEE, ...MARQUEE].map((m, i) => (
              <span key={i} className="font-display flex items-center gap-12 whitespace-nowrap text-3xl text-mute">
                {m} <span className="text-brand-500">✦</span>
              </span>
            ))}
          </div>
          <div className="animate-marquee flex w-max shrink-0 gap-12 pr-12" aria-hidden="true">
            {[...MARQUEE, ...MARQUEE].map((m, i) => (
              <span key={i} className="font-display flex items-center gap-12 whitespace-nowrap text-3xl text-mute">
                {m} <span className="text-brand-500">✦</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-28">
        <Reveal className="mx-auto max-w-2xl text-center" variant="blur">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-600">Features</p>
          <h2 className="mt-3 text-5xl leading-[1.05] sm:text-6xl">Everything you need to talk, nothing you don't.</h2>
        </Reveal>
        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} variant={['up', 'flip', 'zoom', 'up'][i % 4]} delay={(i % 4) * 90}>
              <Tilt className="group h-full rounded-3xl" max={7}>
                <div className="shadow-soft h-full rounded-3xl border border-line bg-card p-6 transition-colors hover:border-brand-300">
                  <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="text-[28px] leading-tight">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-mute">{text}</p>
                </div>
              </Tilt>
            </Reveal>
          ))}
        </div>
      </section>

      {/* stats */}
      <section className="bg-brand-gradient noise relative overflow-hidden py-20 text-white">
        <div className="relative mx-auto grid max-w-5xl gap-10 px-5 sm:grid-cols-3 [&_.text-gradient]:text-white [&_.text-gradient]:[-webkit-text-fill-color:white] [&_.text-gradient]:animate-none [&_p]:text-white/80">
          <Stat end={120} suffix="ms" label="average delivery time" />
          <Stat end={99} suffix="%" label="messages delivered first try" />
          <Stat end={24} suffix="/7" label="always-on presence" />
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-28">
        <Reveal className="mx-auto max-w-xl text-center" variant="blur">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-600">How it works</p>
          <h2 className="mt-3 text-5xl leading-[1.05] sm:text-6xl">From sign-up to “sent” in a minute.</h2>
        </Reveal>
        <div className="relative mt-16 grid gap-8 md:grid-cols-3">
          <div className="absolute left-[16%] right-[16%] top-9 hidden h-px bg-gradient-to-r from-transparent via-brand-300 to-transparent md:block" />
          {STEPS.map((s, i) => (
            <Reveal key={s.n} variant={i === 0 ? 'left' : i === 2 ? 'right' : 'up'} delay={i * 120} className="relative text-center">
              <span className="font-display relative mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full border border-brand-300 bg-card text-3xl text-brand-600 shadow-glow">
                {s.n}
              </span>
              <h3 className="mt-6 text-3xl">{s.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-mute">{s.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* testimonials */}
      <section id="loved" className="bg-soft/60 py-28">
        <div className="mx-auto max-w-6xl scroll-mt-24 px-5">
          <Reveal className="mx-auto max-w-xl text-center" variant="blur">
            <h2 className="text-5xl leading-[1.05] sm:text-6xl">People love talking here.</h2>
          </Reveal>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {QUOTES.map(([q, n, r], i) => (
              <Reveal key={n} variant="flip" delay={i * 110}>
                <figure className="shadow-soft flex h-full flex-col rounded-3xl border border-line bg-card p-7">
                  <span className="font-display text-6xl leading-none text-brand-300">“</span>
                  <blockquote className="font-display -mt-3 flex-1 text-[26px] leading-snug">{q.replaceAll('"', '')}</blockquote>
                  <figcaption className="mt-6 flex items-center gap-3">
                    <span className="font-display flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-white">{n[0]}</span>
                    <span className="text-sm">
                      <b className="block">{n}</b>
                      <span className="text-mute">{r}</span>
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 py-28">
        <Reveal variant="zoom" className="bg-brand-gradient noise relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] px-6 py-20 text-center text-white shadow-glow">
          <div className="animate-blob absolute -right-10 -top-10 h-64 w-64 bg-white/15 blur-2xl" />
          <h2 className="relative text-5xl leading-[1.05] sm:text-6xl">Your next great conversation starts here.</h2>
          <p className="relative mx-auto mt-4 max-w-md text-white/85">Free to join. No credit card. Just beautiful, instant messaging.</p>
          <div className="relative mt-9">
            <Magnetic>
              <Button as={Link} to={user ? '/app' : '/register'} size="lg" className="!bg-white !text-brand-700 !shadow-lift">
                {user ? 'Open Connectly' : 'Create your account'} <ArrowRight className="h-4 w-4" />
              </Button>
            </Magnetic>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-line px-5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Logo size="sm" withText />
          <p className="flex items-center gap-1.5 text-sm text-mute">
            <Lock className="h-3.5 w-3.5" /> End-to-end tested · © {new Date().getFullYear()} Connectly
          </p>
        </div>
      </footer>
    </div>
  )
}
