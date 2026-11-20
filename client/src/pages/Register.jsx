import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AtSign, Lock, Mail, User } from 'lucide-react'
import AuthShell, { Divider, FormError } from '../components/AuthShell'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import GoogleButton from '../components/GoogleButton'
import { useAuth } from '../context/AuthContext'
import { api, errMsg } from '../lib/api'
import { cn } from '../lib/utils'

function strength(pw) {
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) s++
  return s
}
const LABELS = ['Too short', 'Weak', 'Okay', 'Good', 'Strong']

export default function Register() {
  const nav = useNavigate()
  const { user } = useAuth()
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === 'username' ? e.target.value.toLowerCase().replace(/\s/g, '') : e.target.value }))
  const score = useMemo(() => (form.password ? strength(form.password) : 0), [form.password])

  const validate = () => {
    const e = {}
    if (form.name.trim().length < 2) e.name = 'Enter your full name'
    if (!/^[a-z0-9_.]{3,24}$/.test(form.username)) e.username = '3-24 characters: letters, numbers, dot or underscore'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address'
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) e.password = 'At least 8 characters with a letter and a number'
    setErrors(e)
    return !Object.keys(e).length
  }

  const submit = async (ev) => {
    ev.preventDefault()
    setError('')
    if (!validate()) return
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', { ...form, name: form.name.trim() })
      nav('/verify', { state: { email: data.email, devOtp: data.devOtp } })
    } catch (err) {
      const fields = err.serverData?.errors
      if (fields?.length) setErrors(Object.fromEntries(fields.map((f) => [f.field, f.message])))
      else setError(errMsg(err))
    } finally {
      setLoading(false)
    }
  }

  void user

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join Connectly in under a minute. We'll email you a code to confirm it's you."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <GoogleButton label="Sign up with Google" onDone={() => nav('/app', { replace: true })} />
      <Divider>or with email</Divider>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormError>{error}</FormError>
        <Input label="Full name" icon={User} value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" placeholder="Ayesha Khan" />
        <Input label="Username" icon={AtSign} value={form.username} onChange={set('username')} error={errors.username} autoComplete="username" placeholder="ayesha.khan" />
        <Input label="Email" icon={Mail} type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" placeholder="you@example.com" />
        <div>
          <Input label="Password" icon={Lock} type="password" value={form.password} onChange={set('password')} error={errors.password} autoComplete="new-password" placeholder="Create a strong password" />
          {form.password && (
            <div className="mt-2.5 flex items-center gap-3">
              <div className="flex flex-1 gap-1.5">
                {[1, 2, 3, 4].map((i) => (
                  <span key={i} className={cn('h-1.5 flex-1 rounded-full transition-colors duration-300', i <= score ? ['', 'bg-rose-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-500'][score] : 'bg-line')} />
                ))}
              </div>
              <span className="w-16 text-right text-xs font-semibold italic text-mute">{LABELS[score]}</span>
            </div>
          )}
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Create account
        </Button>
        <p className="text-center text-xs text-mute">By continuing you agree to our friendly terms and privacy policy.</p>
      </form>
    </AuthShell>
  )
}
