import { useEffect, useRef, useState } from 'react'

/** Adds the "in" state once the element scrolls into view. */
export function useReveal({ threshold = 0.15, rootMargin = '0px 0px -8% 0px', once = true } = {}) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          if (once) io.disconnect()
        } else if (!once) setShown(false)
      },
      { threshold, rootMargin }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold, rootMargin, once])

  return [ref, shown]
}

/** Animates a number from 0 to `end` when it becomes visible. */
export function useCountUp(end, shown, duration = 1400) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!shown) return
    let raf
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 4)
      setValue(Math.round(end * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [end, shown, duration])
  return value
}
