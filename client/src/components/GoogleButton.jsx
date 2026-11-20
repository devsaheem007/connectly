import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useGoogleSignIn } from '../hooks/useGoogleSignIn'
import { errMsg } from '../lib/api'

export const GoogleLogo = (props) => (
  <svg viewBox="0 0 48 48" width="20" height="20" {...props}>
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
    <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
)

/** "Continue with Google" — shows a helpful message if Google isn't configured. */
export default function GoogleButton({ label = 'Continue with Google', onDone }) {
  const { config, googleLogin } = useAuth()
  const toast = useToast()
  const { ready, requestToken } = useGoogleSignIn(config.googleClientId)
  const [busy, setBusy] = useState(false)

  const click = async () => {
    if (!config.googleClientId) {
      toast.info('Add GOOGLE_CLIENT_ID to server/.env to turn this on (see README → Google login).', { title: 'Google sign-in not set up yet' })
      return
    }
    setBusy(true)
    try {
      const token = await requestToken()
      const user = await googleLogin(token)
      onDone?.(user)
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={click}
      disabled={busy || (Boolean(config.googleClientId) && !ready)}
      data-cursor="Google"
      className="group flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-line bg-card text-[15px] font-semibold transition hover:border-brand-300 hover:bg-soft active:scale-[0.98] disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleLogo className="transition-transform duration-300 group-hover:rotate-[360deg]" />}
      {label}
    </button>
  )
}
