import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Menu rendered in a portal and positioned next to an anchor element, so it is
 * never clipped by a scrolling parent. Flips above/left when near screen edges.
 */
export default function FloatingMenu({ anchor, onClose, children, align = 'auto', className = '' }) {
  const ref = useRef(null)
  const [pos, setPos] = useState({ top: -999, left: -999 })

  useLayoutEffect(() => {
    if (!anchor || !ref.current) return
    const a = anchor.getBoundingClientRect()
    const m = ref.current.getBoundingClientRect()
    const pad = 8
    let top = a.bottom + 6
    if (top + m.height > window.innerHeight - pad) top = Math.max(pad, a.top - m.height - 6)
    let left = align === 'left' ? a.left : a.right - m.width
    if (align === 'auto' && a.left + m.width < window.innerWidth - pad && a.right - m.width < pad) left = a.left
    left = Math.min(Math.max(pad, left), window.innerWidth - m.width - pad)
    setPos({ top, left })
  }, [anchor, align, children])

  if (!anchor) return null
  return createPortal(
    <>
      <div className="fixed inset-0 z-[70]" onClick={onClose} onContextMenu={(e) => (e.preventDefault(), onClose())} />
      <div
        ref={ref}
        style={{ top: pos.top, left: pos.left }}
        className={`animate-pop glass shadow-lift fixed z-[71] min-w-52 origin-top overflow-hidden rounded-2xl p-1.5 ${className}`}
      >
        {children}
      </div>
    </>,
    document.body
  )
}
