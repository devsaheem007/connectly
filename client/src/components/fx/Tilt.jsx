import { useRef } from 'react'
import { cn } from '../../lib/utils'

/** 3D tilt + moving spotlight that follows the pointer. */
export default function Tilt({ children, className, max = 8, spotlight = true }) {
  const ref = useRef(null)

  const move = (e) => {
    const el = ref.current
    if (!el || !window.matchMedia('(hover: hover)').matches) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    el.style.transform = `perspective(900px) rotateY(${(px - 0.5) * max * 2}deg) rotateX(${(0.5 - py) * max * 2}deg) translateZ(0)`
    el.style.setProperty('--mx', `${px * 100}%`)
    el.style.setProperty('--my', `${py * 100}%`)
  }
  const reset = () => {
    if (ref.current) ref.current.style.transform = ''
  }

  return (
    <div
      ref={ref}
      onMouseMove={move}
      onMouseLeave={reset}
      className={cn('relative transition-transform duration-200 ease-out will-change-transform', className)}
    >
      {spotlight && <div className="spotlight pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100 [div:hover>&]:opacity-100" />}
      {children}
    </div>
  )
}
