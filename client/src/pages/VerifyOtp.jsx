import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import AuthShell, { FormError } from '../components/AuthShell'
import Button from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api, errMsg } from '../lib/api'
import { cn } from '../lib/utils'

const LEN = 6

export default function VerifyOtp() {
  const { state } = useLocation()
  const nav = useNavigate()
  const { verifyOtp } = useAuth()
  const toast = useToast()
  const email = state?.email
  const [digits, setDigits] = useState(Array(LEN).fill(''))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(45)
  const [devOtp, setDevOtp] = useState(state?.devOtp)
  const refs = useRef([])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  if (!email) return <Navigate to="/register" replace />

  const submit = async (code) => {
    setError('')
    setLoading(true)
    try {
      await verifyOtp(email, code)
      toast.success('Email verified — welcome to Connectly!')
      nav('/app', { replace: true })
    } catch (err) {
      setError(errMsg(err))
      setDigits(Array(LEN).fill(''))
      refs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const update = (i, v) => {
    const clean = v.replace(/\D/g, '')
    if (!clean) {
      setDigits((d) => d.map((x, idx) => (idx === i ? '' : x)))
      return
    }
    // paste of several digits
    if (clean.length > 1) {
      const next = Array(LEN).fill('')
      clean.slice(0, LEN).split('').forEach((c, idx) => (next[idx] = c))
      setDigits(next)
      const focus = Math.min(clean.length, LEN - 1)
      refs.current[focus]?.focus()
      if (clean.length >= LEN) submit(next.join(''))
      return
    }
    const next = digits.map((x, idx) => (idx === i ? clean : x))
    setDigits(next)
    if (i < LEN - 1) refs.current[i + 1]?.focus()
    if (next.every(Boolean)) submit(next.join(''))
  }

  const onKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < LEN - 1) refs.current[i + 1]?.focus()
  }

  const resend = async () => {
    setError('')
    try {
      const { data } = await api.post('/auth/resend-otp', { email })
      setDevOtp(data.devOtp)
      setCooldown(45)
      toast.success('A new code is on its way')
    } catch (err) {
      setError(errMsg(err))
    }
  }

  return (
    <AuthShell
      title="Check your email"
      subtitle={
        <>
          We sent a 6-digit code to <b className="font-semibold text-ink">{email}</b>. It expires in 10 minutes.
        </>
      }
      footer={
        <>
          Wrong email?{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:underline">
            Start over
          </Link>
        </>
      }
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient-soft">
        <MailCheck className="h-8 w-8 text-brand-500" />
      </div>
      {state?.notice && <p className="mb-4 text-sm text-mute">{state.notice}</p>}
      <FormError>{error}</FormError>

      <div className="flex justify-between gap-2">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            value={d}
            onChange={(e) => update(i, e.target.value)}
            onKeyDown={(e) => onKey(i, e)}
            onFocus={(e) => e.target.select()}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={LEN}
            aria-label={`Digit ${i + 1}`}
            className={cn(
              'font-display h-14 w-full min-w-0 rounded-xl border bg-card text-center text-3xl outline-none transition',
              'focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15',
              d ? 'border-brand-300' : 'border-line'
            )}
          />
        ))}
      </div>

      {devOtp && (
        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <b>Development mode:</b> email isn't configured, so your code is <b className="font-mono tracking-widest">{devOtp}</b> (also printed in the server console).
        </p>
      )}

      <Button size="lg" className="mt-6 w-full" loading={loading} disabled={digits.some((d) => !d)} onClick={() => submit(digits.join(''))}>
        Verify email
      </Button>

      <p className="mt-5 text-center text-sm text-mute">
        Didn't get it?{' '}
        {cooldown > 0 ? (
          <span>Resend in {cooldown}s</span>
        ) : (
          <button onClick={resend} className="font-semibold text-brand-600 hover:underline">
            Resend code
          </button>
        )}
      </p>
    </AuthShell>
  )
}
