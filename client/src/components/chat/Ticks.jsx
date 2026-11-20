import { AlertCircle, Check, CheckCheck, Clock } from 'lucide-react'
import { cn } from '../../lib/utils'

/** sent / delivered / read indicator for your own messages. */
export default function Ticks({ status, className, onDark = false }) {
  const base = 'h-[15px] w-[15px] shrink-0'
  if (status === 'sending') return <Clock className={cn(base, 'opacity-70', className)} />
  if (status === 'failed') return <AlertCircle className={cn(base, 'text-rose-500', className)} />
  if (status === 'read') return <CheckCheck className={cn(base, onDark ? 'text-sky-200' : 'text-sky-500', className)} />
  if (status === 'delivered') return <CheckCheck className={cn(base, 'opacity-70', className)} />
  return <Check className={cn(base, 'opacity-70', className)} />
}
