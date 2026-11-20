import { useEffect, useRef } from 'react'

/** Thin gradient bar showing how far down the page you are. */
export default function ScrollProgress() {
  const bar = useRef(null)
  useEffect(() => {
    const update = () => {
      const h = document.documentElement
      const p = h.scrollTop / Math.max(h.scrollHeight - h.clientHeight, 1)
      if (bar.current) bar.current.style.transform = `scaleX(${p})`
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])
  return <div ref={bar} className="bg-brand-gradient fixed left-0 top-0 z-[90] h-[3px] w-full origin-left" style={{ transform: 'scaleX(0)' }} />
}
