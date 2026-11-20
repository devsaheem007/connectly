import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Lock, Mail, Sparkles } from 'lucide-react'
import AuthShell, { Divider, FormError } from '../components/AuthShell'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import GoogleButton from '../components/GoogleButton'
import { useAuth } from '../context/AuthContext'
import { errMsg } from '../lib/api'

export default function Login() {
  const { login, demoLogin, config } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)

  const dest = loc.state?.from || '/app'
  const done = (user) => nav(user.role !== 'user' && dest === '/app' ? '/app' : dest, { replace: true })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!identifier.trim() || !password) return setError('Enter your email or username and your password.')
    setLoading(true)
    try {
      done(await login(identifier, password))
    } catch (err) {
      if (err.serverCode === 'NOT_VERIFIED') {
        return nav('/verify', { state: { email: err.serverData.email, devOtp: err.serverData.devOtp, notice: err.userMessage } })
      }
      setError(errMsg(err))
    } finally {
      setLoading(false)
    }
  }

  const demo = async () => {
    setError('')
    setDemoLoading(true)
    try {
      done(await demoLogin())
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setDemoLoading(false)
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to pick up your conversations right where you left them."
      footer={
        <>
          New to Connectly?{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <GoogleButton onDone={done} />
      <Divider>or with email</Divider>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormError>{error}</FormError>
        <Input label="Email or username" icon={Mail} value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" placeholder="you@example.com" autoFocus />
        <div>
          <Input label="Password" icon={Lock} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Your password" />
          <div className="mt-2 text-right">
            <Link to="/forgot-password" className="text-[13px] font-semibold text-brand-600 hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Log in
        </Button>
      </form>

      {config.demoLogin && (
        <Button variant="outline" size="md" className="mt-3 w-full" icon={Sparkles} onClick={demo} loading={demoLoading}>
          Try the demo account
        </Button>
      )}
    </AuthShell>
  )
}
