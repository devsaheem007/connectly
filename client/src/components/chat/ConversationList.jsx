import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, MessageSquarePlus, Search, SearchX, UserPlus, Users, WifiOff, X } from 'lucide-react'
import ConversationItem from './ConversationItem'
import { NewChatModal, NewGroupModal } from './NewChatModal'
import Avatar from '../ui/Avatar'
import { EmptyState, ListSkeleton } from '../ui/misc'
import { api } from '../../lib/api'
import { cn, convTitle, listStamp, previewOf } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'
import { useChat } from '../../context/ChatContext'
import { useToast } from '../../context/ToastContext'

const FILTERS = [
  ['all', 'All'],
  ['unread', 'Unread'],
  ['groups', 'Groups'],
  ['archived', 'Archived'],
]

export default function ConversationList() {
  const { user } = useAuth()
  const { conversations, convLoading, activeId, typing, isOnline, setPreference, connected, startDirect, requestNotificationPermission, jumpToMessage } = useChat()
  const toast = useToast()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [newChat, setNewChat] = useState(false)
  const [newGroup, setNewGroup] = useState(false)
  const [people, setPeople] = useState([])
  const [found, setFound] = useState([])
  const [notifAsk, setNotifAsk] = useState(() => 'Notification' in window && Notification.permission === 'default' && !sessionStorage.getItem('connectly:notif-dismissed'))

  const query = q.trim().toLowerCase()

  // server-side search (people + message text) once the user has typed enough
  useEffect(() => {
    if (query.length < 2) {
      setPeople([])
      setFound([])
      return
    }
    let alive = true
    const t = setTimeout(async () => {
      const [p, m] = await Promise.allSettled([api.get('/users/search', { params: { q: query } }), api.get('/messages/search', { params: { q: query } })])
      if (!alive) return
      setPeople(p.status === 'fulfilled' ? p.value.data.users : [])
      setFound(m.status === 'fulfilled' ? m.value.data.results : [])
    }, 300)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [query])

  const { pinned, rest, archivedCount } = useMemo(() => {
    const matches = (c) => !query || convTitle(c, user._id).toLowerCase().includes(query)
    let list = conversations.filter(matches)
    const archivedCount = conversations.filter((c) => c.archived).length
    if (filter === 'archived') list = list.filter((c) => c.archived)
    else {
      list = list.filter((c) => !c.archived)
      if (filter === 'unread') list = list.filter((c) => c.unread > 0)
      if (filter === 'groups') list = list.filter((c) => c.isGroup)
    }
    return { pinned: list.filter((c) => c.pinned), rest: list.filter((c) => !c.pinned), archivedCount }
  }, [conversations, filter, query, user._id])

  const onPref = async (conv, prefs) => {
    try {
      await setPreference(conv._id, prefs)
      if ('archived' in prefs) toast.success(prefs.archived ? 'Chat archived' : 'Chat restored')
    } catch (e) {
      toast.error(e.userMessage || 'Could not update the chat')
    }
  }

  const openPerson = async (u) => {
    try {
      const conv = await startDirect(u._id)
      setQ('')
      nav(`/app/c/${conv._id}`)
    } catch (e) {
      toast.error(e.userMessage || 'Could not start the chat')
    }
  }

  const openMessage = (m) => {
    setQ('')
    nav(`/app/c/${m.conversation}`)
    setTimeout(() => jumpToMessage(m.conversation, m._id), 250)
  }

  const renderItem = (c) => (
    <ConversationItem
      key={c._id}
      conv={c}
      meId={user._id}
      active={c._id === activeId}
      typingUsers={Object.keys(typing[c._id] || {})}
      online={!c.isGroup && isOnline(c.members.find((m) => String(m.user?._id) !== String(user._id))?.user?._id)}
      onPref={onPref}
    />
  )

  const noResults = query && !pinned.length && !rest.length && !people.length && !found.length

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-4 pb-2 pt-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[34px] leading-none">Messages</h2>
          <div className="flex items-center gap-1">
            <button onClick={() => setNewGroup(true)} className="rounded-full p-2.5 text-mute transition hover:bg-soft hover:text-ink" title="New group" aria-label="New group">
              <Users className="h-5 w-5" />
            </button>
            <button onClick={() => setNewChat(true)} className="bg-brand-gradient shadow-glow rounded-full p-2.5 text-white transition hover:brightness-110 active:scale-95" title="New chat" aria-label="New chat" data-cursor="New">
              <MessageSquarePlus className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-mute" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search chats, people, messages"
            className="h-11 w-full rounded-xl border border-transparent bg-soft pl-10 pr-9 text-sm outline-none transition placeholder:text-mute focus:border-brand-300 focus:bg-card focus:ring-4 focus:ring-brand-500/12"
          />
          {q && (
            <button onClick={() => setQ('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-mute hover:text-ink" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="scroll-hide mt-3 flex gap-1.5 overflow-x-auto">
          {FILTERS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={cn('shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold italic transition', filter === id ? 'bg-ink text-paper' : 'bg-soft text-mute hover:text-ink')}
            >
              {label}
              {id === 'archived' && archivedCount > 0 && <span className="ml-1 opacity-70">{archivedCount}</span>}
            </button>
          ))}
        </div>
      </div>

      {!connected && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl bg-amber-500/12 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
          <WifiOff className="h-4 w-4" /> Reconnecting to Connectly…
        </div>
      )}
      {notifAsk && (
        <div className="mx-4 mb-2 flex items-center gap-3 rounded-2xl bg-brand-500/10 px-3 py-2.5">
          <Bell className="h-5 w-5 shrink-0 text-brand-600" />
          <p className="flex-1 text-xs leading-snug">Get alerts for new messages when this tab is in the background.</p>
          <button
            onClick={async () => {
              await requestNotificationPermission()
              setNotifAsk(false)
            }}
            className="rounded-lg bg-brand-500 px-2.5 py-1.5 text-xs font-bold text-white"
          >
            Enable
          </button>
          <button
            onClick={() => {
              sessionStorage.setItem('connectly:notif-dismissed', '1')
              setNotifAsk(false)
            }}
            className="text-mute hover:text-ink"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-2 pb-24 md:pb-4">
        {convLoading ? (
          <ListSkeleton />
        ) : (
          <>
            {pinned.length > 0 && <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-mute">Pinned</p>}
            {pinned.map(renderItem)}
            {pinned.length > 0 && rest.length > 0 && <p className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-mute">Recent</p>}
            {rest.map(renderItem)}

            {query.length >= 2 && people.length > 0 && (
              <>
                <p className="px-3 pb-1 pt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-mute">People</p>
                {people.slice(0, 6).map((u) => (
                  <button key={u._id} onClick={() => openPerson(u)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-soft">
                    <Avatar src={u.avatar} name={u.name} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="font-display block truncate text-xl leading-tight">{u.name}</span>
                      <span className="block truncate text-xs text-mute">@{u.username}</span>
                    </span>
                    <UserPlus className="h-4 w-4 text-brand-500" />
                  </button>
                ))}
              </>
            )}

            {query.length >= 2 && found.length > 0 && (
              <>
                <p className="px-3 pb-1 pt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-mute">Messages</p>
                {found.map((m) => {
                  const conv = conversations.find((c) => c._id === m.conversation)
                  return (
                    <button key={m._id} onClick={() => openMessage(m)} className="block w-full rounded-2xl px-3 py-2.5 text-left transition hover:bg-soft">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-display truncate text-lg leading-tight">{conv ? convTitle(conv, user._id) : 'Conversation'}</span>
                        <span className="shrink-0 text-[11px] text-mute">{listStamp(m.createdAt)}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-[13px] text-mute">
                        <b className="font-semibold text-ink/80">{String(m.sender?._id) === String(user._id) ? 'You' : m.sender?.name?.split(' ')[0]}:</b> {previewOf(m, user._id)}
                      </span>
                    </button>
                  )
                })}
              </>
            )}

            {!convLoading && !query && conversations.length === 0 && (
              <EmptyState
                icon={MessageSquarePlus}
                title="No conversations yet"
                text="Find someone and say hello. Your chats will show up right here."
                action={
                  <button onClick={() => setNewChat(true)} className="bg-brand-gradient shadow-glow rounded-xl px-5 py-2.5 text-sm font-semibold text-white">
                    Start a chat
                  </button>
                }
              />
            )}
            {!query && conversations.length > 0 && !pinned.length && !rest.length && (
              <EmptyState icon={filter === 'archived' ? SearchX : Bell} title={filter === 'unread' ? 'All caught up' : filter === 'archived' ? 'Nothing archived' : 'Nothing here'} text={filter === 'unread' ? 'You have no unread messages.' : 'Switch filters to see your other chats.'} className="py-10" />
            )}
            {noResults && <EmptyState icon={SearchX} title="No matches" text={`Nothing found for “${q}”.`} className="py-10" />}
          </>
        )}
      </div>

      <NewChatModal
        open={newChat}
        onClose={() => setNewChat(false)}
        onGroup={() => {
          setNewChat(false)
          setNewGroup(true)
        }}
      />
      <NewGroupModal open={newGroup} onClose={() => setNewGroup(false)} />
    </div>
  )
}
