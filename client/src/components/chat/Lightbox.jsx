import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react'
import { assetUrl } from '../../lib/api'

/** Full-screen image viewer with keyboard navigation. */
export default function Lightbox({ images, index, onClose, onIndex }) {
  useEffect(() => {
    if (index == null) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && index < images.length - 1) onIndex(index + 1)
      if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [index, images, onClose, onIndex])

  if (index == null || !images[index]) return null
  const img = images[index]
  const src = assetUrl(img.url)

  return createPortal(
    <div className="animate-fade fixed inset-0 z-[95] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="absolute right-4 top-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
        <a href={src} download={img.name} target="_blank" rel="noreferrer" className="rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20" aria-label="Download">
          <Download className="h-5 w-5" />
        </a>
        <button onClick={onClose} className="rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
      </div>
      {index > 0 && (
        <button
          onClick={(e) => (e.stopPropagation(), onIndex(index - 1))}
          className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
          aria-label="Previous"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {index < images.length - 1 && (
        <button
          onClick={(e) => (e.stopPropagation(), onIndex(index + 1))}
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
          aria-label="Next"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
      <img src={src} alt={img.name} className="animate-pop max-h-[88dvh] max-w-full rounded-2xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
      <p className="absolute bottom-5 left-1/2 max-w-[80vw] -translate-x-1/2 truncate rounded-full bg-white/10 px-4 py-1.5 text-sm text-white">
        {img.name} {images.length > 1 && `· ${index + 1}/${images.length}`}
      </p>
    </div>,
    document.body
  )
}
