import { useCallback, useEffect, useRef, useState } from 'react'

const SRC = 'https://accounts.google.com/gsi/client'

function loadScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve()
    const existing = document.querySelector(`script[src="${SRC}"]`)
    const script = existing || Object.assign(document.createElement('script'), { src: SRC, async: true, defer: true })
    script.addEventListener('load', () => resolve())
    script.addEventListener('error', () => reject(new Error('Could not load Google sign-in. Check your connection.')))
    if (!existing) document.head.appendChild(script)
  })
}

/**
 * Custom "Continue with Google" using Google Identity Services' token client,
 * so the button can be styled to match the app. Resolves with an access token.
 */
export function useGoogleSignIn(clientId) {
  const [ready, setReady] = useState(false)
  const clientRef = useRef(null)
  const pending = useRef(null)

  useEffect(() => {
    if (!clientId) return
    let alive = true
    loadScript()
      .then(() => {
        if (!alive) return
        clientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile',
          callback: (resp) => {
            if (resp.error || !resp.access_token) pending.current?.reject(new Error('Google sign-in was cancelled'))
            else pending.current?.resolve(resp.access_token)
            pending.current = null
          },
          error_callback: () => {
            pending.current?.reject(new Error('Google sign-in was cancelled'))
            pending.current = null
          },
        })
        setReady(true)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [clientId])

  const requestToken = useCallback(
    () =>
      new Promise((resolve, reject) => {
        if (!clientRef.current) return reject(new Error('Google sign-in is still loading. Try again in a moment.'))
        pending.current = { resolve, reject }
        clientRef.current.requestAccessToken({ prompt: 'select_account' })
      }),
    []
  )

  return { ready, requestToken }
}
