import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, Send } from 'lucide-react'
import AuthShell, { FormError } from '../components/AuthShell'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { api, errMsg } from '../lib/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [devLink, setDevLink] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter a valid email address.')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/forgot-password', { email })
      setDevLink(data.devLink || '')
      setSent(true)
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title={sent ? 'Link on its way' : 'Forgot your password?'}
      subtitle={sent ? 'If an account exists for that email, we just sent a secure reset link. It is valid for 30 minutes.' : "No worries. Enter your email and we'll send you a secure link to choose a new one."}
      footer={
        <Link to="/login" className="inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to log in
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient-soft">
            <Send className="h-8 w-8 text-brand-500" />
          </div>
          {devLink && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              <b>Development mode:</b> email isn't configured. Use this link (also printed in the server console):
              <Link to={new URL(devLink).pathname} className="mt-1.5 block break-all font-mono text-xs font-semibold underline">
                {devLink}
              </Link>
            </p>
          )}
          <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
            Use a different email
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormError>{error}</FormError>
          <Input label="Email" icon={Mail} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" autoFocus />
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
