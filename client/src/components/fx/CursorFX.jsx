import { useEffect, useRef } from 'react'
import { useTheme } from '../../context/ThemeContext'

/**
 * Custom cursor: a trailing "liquid" ring + sharp dot that morphs by context
 * (grows on links/buttons and shows a label, becomes a caret over text fields,
 * squeezes on press) and leaves a short sparkle trail. Disabled on touch
 * devices and when the user prefers reduced motion.
 */
export default function CursorFX() {
  const { cursorFx } = useTheme()
  const ringRef = useRef(null)
  const dotRef = useRef(null)
  const labelRef = useRef(null)

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!cursorFx || !fine || reduced) return

    const ring = ringRef.current
    const dot = dotRef.current
    const label = labelRef.current
    document.documentElement.classList.add('fx-cursor')

    let mx = -100
    let my = -100
    let rx = -100
    let ry = -100
    let raf
    let lastSpark = 0
    let visible = false

    const setVisible = (v) => {
      visible = v
      ring.classList.toggle('is-hidden', !v)
      dot.classList.toggle('is-hidden', !v)
    }
    setVisible(false)

    const spark = (x, y) => {
      const s = document.createElement('span')
      const size = 4 + Math.random() * 6
      s.className = 'cursor-spark'
      s.style.width = s.style.height = `${size}px`
      s.style.background = Math.random() > 0.5 ? 'var(--brand-500)' : 'var(--brand-alt)'
      s.style.transform = `translate(${x - size / 2}px, ${y - size / 2}px)`
      document.body.appendChild(s)
      const dx = (Math.random() - 0.5) * 40
      const dy = 18 + Math.random() * 30
      const anim = s.animate(
        [
          { transform: `translate(${x - size / 2}px, ${y - size / 2}px) scale(1)`, opacity: 0.85 },
          { transform: `translate(${x - size / 2 + dx}px, ${y - size / 2 + dy}px) scale(0)`, opacity: 0 },
        ],
        { duration: 650 + Math.random() * 250, easing: 'cubic-bezier(.2,.7,.3,1)' }
      )
      anim.onfinish = () => s.remove()
    }

    const onMove = (e) => {
      mx = e.clientX
      my = e.clientY
      if (!visible) {
        rx = mx
        ry = my
        setVisible(true)
      }
      dot.style.transform = `translate(${mx}px, ${my}px)`
      const now = performance.now()
      if (now - lastSpark > 55 && Math.random() > 0.55) {
        lastSpark = now
        spark(mx, my)
      }

      const el = e.target instanceof Element ? e.target : null
      const field = el?.closest('input:not([type=checkbox]):not([type=radio]):not([type=file]), textarea, [contenteditable="true"]')
      const interactive = el?.closest('a, button, [role="button"], label, select, summary, [data-cursor]')
      ring.classList.toggle('is-text', Boolean(field))
      ring.classList.toggle('is-hover', Boolean(interactive) && !field)
      const text = interactive?.getAttribute?.('data-cursor') || interactive?.closest?.('[data-cursor]')?.getAttribute('data-cursor')
      if (text && !field) {
        label.textContent = text
        label.classList.add('show')
      } else label.classList.remove('show')
      label.style.transform = `translate(${mx}px, ${my}px)`
    }

    const loop = () => {
      rx += (mx - rx) * 0.17
      ry += (my - ry) * 0.17
      ring.style.transform = `translate(${rx}px, ${ry}px)`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const down = () => ring.classList.add('is-down')
    const up = () => ring.classList.remove('is-down')
    const leave = () => setVisible(false)
    const enter = () => setVisible(true)

    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mousedown', down)
    window.addEventListener('mouseup', up)
    document.addEventListener('mouseleave', leave)
    document.addEventListener('mouseenter', enter)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', down)
      window.removeEventListener('mouseup', up)
      document.removeEventListener('mouseleave', leave)
      document.removeEventListener('mouseenter', enter)
      document.documentElement.classList.remove('fx-cursor')
    }
  }, [cursorFx])

  if (!cursorFx) return null
  return (
    <>
      <div ref={ringRef} className="cursor-ring is-hidden" />
      <div ref={dotRef} className="cursor-dot is-hidden" />
      <div ref={labelRef} className="cursor-label" />
    </>
  )
}
