import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, Lock } from 'lucide-react'
import AuthShell, { FormError } from '../components/AuthShell'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { api, errMsg } from '../lib/api'

export default function ResetPassword() {
  const { token } = useParams()
  const nav = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return setError('Use at least 8 characters with a letter and a number.')
    if (password !== confirm) return setError("The two passwords don't match.")
    setLoading(true)
    try {
      await api.post(`/auth/reset-password/${token}`, { password })
      setDone(true)
      setTimeout(() => nav('/login', { replace: true }), 2200)
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="You're all set. Redirecting you to log in…">
        <div className="animate-pop flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/12">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>
        <Button as={Link} to="/login" size="lg" className="mt-6 w-full">
          Log in now
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Make it something strong you haven't used elsewhere. Resetting signs you out of every device."
      footer={
        <Link to="/login" className="font-semibold text-brand-600 hover:underline">
          Back to log in
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormError>{error}</FormError>
        <Input label="New password" icon={Lock} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="At least 8 characters" autoFocus />
        <Input label="Confirm password" icon={Lock} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" placeholder="Repeat the password" />
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Update password
        </Button>
      </form>
    </AuthShell>
  )
}
