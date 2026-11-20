import { useMemo, useState } from 'react'
import {
  Archive, ArchiveRestore, Bell, BellOff, Crown, FileText, Globe, LogOut, MapPin, MoreHorizontal, Pencil, Pin, PinOff, Shield, ShieldOff, Trash2, UserMinus, UserPlus, X,
} from 'lucide-react'
import Avatar from '../ui/Avatar'
import FloatingMenu from '../ui/FloatingMenu'
import { Badge, MenuItem } from '../ui/misc'
import Button from '../ui/Button'
import { AddMembersModal, ConfirmModal, EditGroupModal } from './GroupModals'
import Lightbox from './Lightbox'
import { assetUrl, errMsg } from '../../lib/api'
import { cn, formatBytes, lastSeenLabel, otherMember } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'
import { useChat } from '../../context/ChatContext'
import { useToast } from '../../context/ToastContext'

function Section({ title, children, action }) {
  return (
    <section className="border-t border-line px-5 py-4">
      <div className="mb-2.5 flex items-center justify-between">
        <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-mute">{title}</h4>
        {action}
      </div>
      {children}
    </section>
  )
}

export default function InfoPanel({ conv, onClose, onClear }) {
  const { user } = useAuth()
  const { msgs, isOnline, lastSeenOf, setPreference, removeMember, toggleAdmin, leaveGroup, deleteGroup } = useChat()
  const toast = useToast()
  const [menu, setMenu] = useState(null) // {anchor, member}
  const [edit, setEdit] = useState(false)
  const [add, setAdd] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [lightbox, setLightbox] = useState(null)

  const me = conv.members.find((m) => String(m.user?._id) === String(user._id))
  const iAmAdmin = me?.role === 'admin'
  const iAmCreator = String(conv.createdBy) === String(user._id)
  const other = !conv.isGroup ? otherMember(conv, user._id) : null

  const media = useMemo(() => {
    const items = msgs[conv._id]?.items || []
    const all = items.filter((m) => !m.isDeleted).flatMap((m) => m.attachments || [])
    return { images: all.filter((a) => a.kind === 'image').reverse(), files: all.filter((a) => a.kind !== 'image').reverse() }
  }, [msgs, conv._id])

  const safe = (fn, ok) => async () => {
    try {
      await fn()
      if (ok) toast.success(ok)
    } catch (e) {
      toast.error(errMsg(e))
    }
  }

  const pref = (prefs, ok) => safe(() => setPreference(conv._id, prefs), ok)()

  const title = conv.isGroup ? conv.name : other?.name || 'Deleted user'
  const sortedMembers = [...conv.members].sort((a, b) => (b.role === 'admin') - (a.role === 'admin') || a.user.name.localeCompare(b.user.name))

  return (
    <aside className="flex h-full w-full flex-col bg-card">
      <div className="flex items-center justify-between px-5 py-4">
        <h3 className="text-2xl">{conv.isGroup ? 'Group info' : 'Contact info'}</h3>
        <button onClick={onClose} className="rounded-full p-2 text-mute transition hover:bg-soft hover:text-ink" aria-label="Close info">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col items-center px-6 pb-6 pt-2 text-center">
          <Avatar src={conv.isGroup ? conv.avatar : other?.avatar} name={title} size="2xl" group={conv.isGroup} online={other && !other.hidesOnline ? isOnline(other._id) : undefined} />
          <h2 className="mt-4 text-4xl leading-tight">{title}</h2>
          {conv.isGroup ? (
            <p className="mt-1 text-sm text-mute">Group · {conv.members.length} members</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-mute">@{other?.username}</p>
              <p className={cn('mt-1 text-sm font-semibold', other && isOnline(other._id) ? 'text-emerald-500' : 'text-mute')}>
                {other?.hidesOnline ? '' : other && isOnline(other._id) ? '● online' : lastSeenLabel(lastSeenOf(other))}
              </p>
            </>
          )}
          {conv.isGroup && iAmAdmin && (
            <Button variant="outline" size="sm" icon={Pencil} className="mt-4" onClick={() => setEdit(true)}>
              Edit group
            </Button>
          )}
        </div>

        {conv.isGroup && conv.description && (
          <Section title="About">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{conv.description}</p>
          </Section>
        )}
        {!conv.isGroup && other && (other.statusMessage || other.bio || other.location || other.website) && (
          <Section title="About">
            {other.statusMessage && <p className="mb-2 text-sm font-semibold italic text-brand-600">“{other.statusMessage}”</p>}
            {other.bio && <p className="mb-3 whitespace-pre-wrap text-sm leading-relaxed">{other.bio}</p>}
            {other.location && (
              <p className="mb-1.5 flex items-center gap-2 text-sm text-mute">
                <MapPin className="h-4 w-4" /> {other.location}
              </p>
            )}
            {other.website && (
              <a href={other.website} target="_blank" rel="noreferrer noopener" className="flex items-center gap-2 break-all text-sm text-brand-600 hover:underline">
                <Globe className="h-4 w-4 shrink-0" /> {other.website}
              </a>
            )}
          </Section>
        )}

        <Section title="Chat settings">
          <div className="grid grid-cols-3 gap-2">
            {[
              [conv.pinned ? PinOff : Pin, conv.pinned ? 'Unpin' : 'Pin', () => pref({ pinned: !conv.pinned }, conv.pinned ? 'Unpinned' : 'Pinned to the top')],
              [conv.muted ? Bell : BellOff, conv.muted ? 'Unmute' : 'Mute', () => pref({ muted: !conv.muted }, conv.muted ? 'Notifications on' : 'Notifications muted')],
              [conv.archived ? ArchiveRestore : Archive, conv.archived ? 'Restore' : 'Archive', () => pref({ archived: !conv.archived }, conv.archived ? 'Chat restored' : 'Chat archived')],
            ].map(([Icon, label, fn]) => (
              <button key={label} onClick={fn} className="flex flex-col items-center gap-1.5 rounded-2xl bg-soft px-2 py-3 text-xs font-semibold transition hover:bg-brand-500/10 hover:text-brand-600">
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>
        </Section>

        {conv.isGroup && (
          <Section
            title={`Members · ${conv.members.length}`}
            action={
              iAmAdmin && (
                <button onClick={() => setAdd(true)} className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline">
                  <UserPlus className="h-3.5 w-3.5" /> Add
                </button>
              )
            }
          >
            <ul className="-mx-2">
              {sortedMembers.map((m) => {
                const isMe = String(m.user._id) === String(user._id)
                const creator = String(conv.createdBy) === String(m.user._id)
                const canManage = iAmAdmin && !isMe && !creator
                return (
                  <li key={m.user._id} className="flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-soft">
                    <Avatar src={m.user.avatar} name={m.user.name} size="md" online={m.user.hidesOnline ? undefined : isOnline(m.user._id)} />
                    <div className="min-w-0 flex-1">
                      <p className="font-display truncate text-xl leading-tight">
                        {m.user.name}
                        {isMe && <span className="ml-1.5 font-sans text-xs not-italic text-mute">(you)</span>}
                      </p>
                      <p className="truncate text-xs text-mute">@{m.user.username}</p>
                    </div>
                    {creator ? (
                      <Badge tone="amber"><Crown className="h-3 w-3" /> Creator</Badge>
                    ) : m.role === 'admin' ? (
                      <Badge>Admin</Badge>
                    ) : null}
                    {canManage && (
                      <button onClick={(e) => setMenu({ anchor: e.currentTarget, member: m })} className="rounded-full p-1.5 text-mute transition hover:bg-line/60 hover:text-ink" aria-label={`Manage ${m.user.name}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </Section>
        )}

        {(media.images.length > 0 || media.files.length > 0) && (
          <Section title="Media & files">
            {media.images.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5">
                {media.images.slice(0, 9).map((img, i) => (
                  <button key={img.url + i} onClick={() => setLightbox(i)} className="aspect-square overflow-hidden rounded-xl bg-soft">
                    <img src={assetUrl(img.url)} alt={img.name} loading="lazy" className="h-full w-full object-cover transition hover:scale-110" />
                  </button>
                ))}
              </div>
            )}
            {media.files.slice(0, 6).map((f, i) => (
              <a key={f.url + i} href={assetUrl(f.url)} target="_blank" rel="noreferrer" download={f.name} className="mt-2 flex items-center gap-3 rounded-xl bg-soft px-3 py-2.5 transition hover:bg-line/60">
                <FileText className="h-5 w-5 shrink-0 text-brand-500" />
                <span className="min-w-0 text-sm">
                  <b className="block truncate">{f.name}</b>
                  <span className="text-xs text-mute">{formatBytes(f.size)}</span>
                </span>
              </a>
            ))}
          </Section>
        )}

        <Section title="Danger zone">
          <div className="space-y-1">
            <MenuItem icon={Trash2} danger onClick={() => setConfirm('clear')}>Clear chat for me</MenuItem>
            {conv.isGroup && <MenuItem icon={LogOut} danger onClick={() => setConfirm('leave')}>Leave group</MenuItem>}
            {conv.isGroup && iAmCreator && <MenuItem icon={Trash2} danger onClick={() => setConfirm('delete')}>Delete group for everyone</MenuItem>}
          </div>
        </Section>
      </div>

      {menu && (
        <FloatingMenu anchor={menu.anchor} onClose={() => setMenu(null)}>
          <MenuItem
            icon={menu.member.role === 'admin' ? ShieldOff : Shield}
            onClick={() => {
              const m = menu.member
              setMenu(null)
              safe(() => toggleAdmin(conv._id, m.user._id), m.role === 'admin' ? `${m.user.name} is no longer an admin` : `${m.user.name} is now an admin`)()
            }}
          >
            {menu.member.role === 'admin' ? 'Remove as admin' : 'Make admin'}
          </MenuItem>
          <MenuItem
            icon={UserMinus}
            danger
            onClick={() => {
              const m = menu.member
              setMenu(null)
              setConfirm({ remove: m })
            }}
          >
            Remove from group
          </MenuItem>
        </FloatingMenu>
      )}

      <EditGroupModal conv={conv} open={edit} onClose={() => setEdit(false)} />
      <AddMembersModal conv={conv} open={add} onClose={() => setAdd(false)} />
      <Lightbox images={media.images} index={lightbox} onClose={() => setLightbox(null)} onIndex={setLightbox} />

      <ConfirmModal
        open={confirm === 'clear'}
        onClose={() => setConfirm(null)}
        title="Clear this chat?"
        text="All messages will be removed from your view. Other people keep their copy."
        confirmLabel="Clear chat"
        danger
        onConfirm={onClear}
      />
      <ConfirmModal
        open={confirm === 'leave'}
        onClose={() => setConfirm(null)}
        title="Leave this group?"
        text="You will stop receiving messages from the group. An admin can add you back later."
        confirmLabel="Leave group"
        danger
        onConfirm={safe(async () => {
          await leaveGroup(conv._id)
        })}
      />
      <ConfirmModal
        open={confirm === 'delete'}
        onClose={() => setConfirm(null)}
        title="Delete group for everyone?"
        text="This permanently removes the group and all of its messages for every member. This cannot be undone."
        confirmLabel="Delete group"
        danger
        onConfirm={safe(async () => {
          await deleteGroup(conv._id)
        })}
      />
      <ConfirmModal
        open={Boolean(confirm?.remove)}
        onClose={() => setConfirm(null)}
        title={`Remove ${confirm?.remove?.user.name}?`}
        text="They will lose access to this group and its messages."
        confirmLabel="Remove"
        danger
        onConfirm={safe(() => removeMember(conv._id, confirm.remove.user._id), 'Member removed')}
      />
    </aside>
  )
}
