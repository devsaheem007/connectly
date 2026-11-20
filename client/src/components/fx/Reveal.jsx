import { createElement } from 'react'
import { useReveal } from '../../hooks/useReveal'
import { cn } from '../../lib/utils'

/** Scroll-triggered entrance. variant: up | down | left | right | zoom | blur | flip */
export default function Reveal({ as = 'div', variant = 'up', delay = 0, className, children, ...rest }) {
  const [ref, shown] = useReveal()
  return createElement(as, { ref, className: cn('reveal', shown && 'in', className), 'data-v': variant, style: { '--d': `${delay}ms` }, ...rest }, children)
}

/** Headline whose words slide up one by one. */
export function SplitWords({ text, className, wordClassName, delay = 0, step = 70 }) {
  return (
    <span className={className} aria-label={text}>
      {text.split(' ').map((w, i) => (
        <span key={i} className="word" aria-hidden="true">
          <span className={wordClassName} style={{ '--d': `${delay + i * step}ms` }}>{w}&nbsp;</span>
        </span>
      ))}
    </span>
  )
}
