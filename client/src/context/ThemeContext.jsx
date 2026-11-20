import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)
export const useTheme = () => useContext(ThemeContext)

export const ACCENTS = [
  { id: 'indigo', color: '#6366f1' },
  { id: 'violet', color: '#8b5cf6' },
  { id: 'rose', color: '#f43f5e' },
  { id: 'amber', color: '#f59e0b' },
  { id: 'emerald', color: '#10b981' },
  { id: 'sky', color: '#0ea5e9' },
]

const read = (k, d) => {
  try {
    return localStorage.getItem(k) ?? d
  } catch {
    return d
  }
}
const write = (k, v) => {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* ignore */
  }
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => read('connectly:theme', 'system'))
  const [accent, setAccentState] = useState(() => read('connectly:accent', 'indigo'))
  const [cursorFx, setCursorFxState] = useState(() => read('connectly:cursor', 'on') === 'on')
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const dark = mode === 'dark' || (mode === 'system' && systemDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', dark ? '#0d0c12' : '#faf8f4')
  }, [dark])

  useEffect(() => {
    document.documentElement.dataset.accent = accent
  }, [accent])

  const setTheme = useCallback((m) => {
    setMode(m)
    write('connectly:theme', m)
  }, [])
  const setAccent = useCallback((a) => {
    setAccentState(a)
    write('connectly:accent', a)
  }, [])
  const setCursorFx = useCallback((on) => {
    setCursorFxState(on)
    write('connectly:cursor', on ? 'on' : 'off')
  }, [])
  const toggle = useCallback(() => setTheme(dark ? 'light' : 'dark'), [dark, setTheme])

  const value = useMemo(
    () => ({ mode, dark, accent, cursorFx, setTheme, setAccent, setCursorFx, toggle }),
    [mode, dark, accent, cursorFx, setTheme, setAccent, setCursorFx, toggle]
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
