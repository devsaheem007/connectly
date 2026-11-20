import { memo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Archive, ArchiveRestore, BellOff, Bell, MoreHorizontal, Pin, PinOff } from 'lucide-react'
import Avatar from '../ui/Avatar'
import { Dropdown, MenuItem } from '../ui/misc'
import Ticks from './Ticks'
import { cn, convAvatar, convTitle, listStamp, messageStatus, otherMember, previewOf } from '../../lib/utils'

function ConversationItem({ conv, meId, active, typingUsers, online, onPref }) {
  const [menu, setMenu] = useState(false)
  const title = convTitle(conv, meId)
  const other = !conv.isGroup ? otherMember(conv, meId) : null
  const last = conv.lastMessage
  const mine = last && String(last.sender?._id) === String(meId) && last.type !== 'system'
  const typingNames = typingUsers
    .map((id) => conv.members.find((m) => String(m.user?._id) === id)?.user?.name?.split(' ')[0])
    .filter(Boolean)

  return (
    <div className="group relative">
      <Link
        to={`/app/c/${conv._id}`}
        className={cn(
          'flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors duration-200',
          active ? 'bg-brand-500/12 shadow-soft' : 'hover:bg-soft'
        )}
      >
        <Avatar src={convAvatar(conv, meId)} name={title} size="md" group={conv.isGroup} online={other && !other.hidesOnline ? online : undefined} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className={cn('font-display truncate text-[21px] leading-tight', conv.unread && 'text-ink')}>{title}</p>
            <span className={cn('shrink-0 text-[11px] font-medium', conv.unread ? 'text-brand-600' : 'text-mute')}>{listStamp(conv.lastActivity)}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            {typingNames.length ? (
              <p className="truncate text-[13px] font-semibold italic text-brand-600">{conv.isGroup ? `${typingNames.join(', ')} typing…` : 'typing…'}</p>
            ) : (
              <>
                {mine && <Ticks status={messageStatus(last, conv, meId)} className="h-3.5 w-3.5" />}
                <p className={cn('truncate text-[13px]', conv.unread ? 'font-semibold text-ink' : 'text-mute')}>
                  {last ? previewOf(last, meId, { withSender: conv.isGroup && !mine && last.type !== 'system' }) : conv.isGroup ? 'No messages yet' : 'Say hello 👋'}
                </p>
              </>
            )}
            <span className="ml-auto flex shrink-0 items-center gap-1.5">
              {conv.muted && <BellOff className="h-3.5 w-3.5 text-mute" />}
              {conv.pinned && <Pin className="h-3.5 w-3.5 -rotate-45 text-mute" />}
              {conv.unread > 0 && (
                <span className={cn('flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white', conv.muted ? 'bg-mute' : 'bg-brand-gradient')}>
                  {conv.unread > 99 ? '99+' : conv.unread}
                </span>
              )}
            </span>
          </div>
        </div>
      </Link>

      <div className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100 max-md:hidden">
        <button
          onClick={(e) => {
            e.preventDefault()
            setMenu((m) => !m)
          }}
          className="rounded-full bg-card p-1.5 text-mute shadow-soft ring-1 ring-line hover:text-ink"
          aria-label="Conversation options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        <Dropdown open={menu} onClose={() => setMenu(false)}>
          <MenuItem icon={conv.pinned ? PinOff : Pin} onClick={() => (setMenu(false), onPref(conv, { pinned: !conv.pinned }))}>
            {conv.pinned ? 'Unpin chat' : 'Pin chat'}
          </MenuItem>
          <MenuItem icon={conv.muted ? Bell : BellOff} onClick={() => (setMenu(false), onPref(conv, { muted: !conv.muted }))}>
            {conv.muted ? 'Unmute' : 'Mute notifications'}
          </MenuItem>
          <MenuItem icon={conv.archived ? ArchiveRestore : Archive} onClick={() => (setMenu(false), onPref(conv, { archived: !conv.archived }))}>
            {conv.archived ? 'Unarchive' : 'Archive chat'}
          </MenuItem>
        </Dropdown>
      </div>
    </div>
  )
}

export default memo(ConversationItem)
