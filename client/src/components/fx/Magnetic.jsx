import { useRef } from 'react'

/** Wrapper whose child gently follows the pointer ("magnetic" buttons). */
export default function Magnetic({ children, strength = 0.3, className }) {
  const ref = useRef(null)
  const move = (e) => {
    const el = ref.current
    if (!el || !window.matchMedia('(hover: hover)').matches) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - (r.left + r.width / 2)) * strength
    const y = (e.clientY - (r.top + r.height / 2)) * strength
    el.style.transform = `translate(${x}px, ${y}px)`
  }
  const reset = () => {
    if (ref.current) ref.current.style.transform = ''
  }
  return (
    <span ref={ref} onMouseMove={move} onMouseLeave={reset} className={`inline-block transition-transform duration-200 ease-out ${className || ''}`}>
      {children}
    </span>
  )
}
