import { useEffect, useState } from 'react'
import { Check, Search } from 'lucide-react'
import Avatar from '../ui/Avatar'
import { Spinner } from '../ui/misc'
import { api } from '../../lib/api'
import { cn } from '../../lib/utils'
import { useChat } from '../../context/ChatContext'

/**
 * Searchable list of people. `selected` + `onToggle` make it multi-select;
 * `onPick` makes it single-select (click = choose). Users in `exclude` are hidden.
 */
export default function UserPicker({ selected = [], onToggle, onPick, exclude = [], autoFocus = true, height = 'h-72' }) {
  const { isOnline } = useChat()
  const [q, setQ] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/users/search', { params: { q } })
        if (alive) setUsers(data.users)
      } catch {
        if (alive) setUsers([])
      } finally {
        if (alive) setLoading(false)
      }
    }, q ? 250 : 0)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [q])

  const shown = users.filter((u) => !exclude.includes(u._id))

  return (
    <div>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-mute" />
        <input
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or username"
          className="h-11 w-full rounded-xl border border-line bg-card pl-11 pr-4 text-sm outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
        />
      </div>
      <div className={cn('scroll-thin -mx-2 overflow-y-auto px-2', height)}>
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner />
          </div>
        ) : shown.length === 0 ? (
          <p className="flex h-full items-center justify-center text-center text-sm text-mute">{q ? `No one found for “${q}”` : 'No other people yet. Invite a friend to join!'}</p>
        ) : (
          shown.map((u) => {
            const on = selected.includes(u._id)
            return (
              <button
                key={u._id}
                type="button"
                onClick={() => (onPick ? onPick(u) : onToggle?.(u))}
                className={cn('flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition', on ? 'bg-brand-500/10' : 'hover:bg-soft')}
              >
                <Avatar src={u.avatar} name={u.name} size="md" online={u.hidesOnline ? undefined : isOnline(u._id)} />
                <span className="min-w-0 flex-1">
                  <span className="font-display block truncate text-xl leading-tight">{u.name}</span>
                  <span className="block truncate text-xs text-mute">@{u.username}{u.statusMessage ? ` · ${u.statusMessage}` : ''}</span>
                </span>
                {onToggle && (
                  <span className={cn('flex h-6 w-6 items-center justify-center rounded-full border transition', on ? 'border-transparent bg-brand-gradient text-white' : 'border-line')}>
                    {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
