import { useMemo, useState } from 'react'
import { Check, Search } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Avatar from '../ui/Avatar'
import { cn, convAvatar, convTitle } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'
import { useChat } from '../../context/ChatContext'
import { useToast } from '../../context/ToastContext'
import { errMsg } from '../../lib/api'

export default function ForwardModal({ message, onClose }) {
  const { user } = useAuth()
  const { conversations, forwardMessage } = useChat()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState([])
  const [busy, setBusy] = useState(false)

  const list = useMemo(
    () => conversations.filter((c) => convTitle(c, user._id).toLowerCase().includes(q.trim().toLowerCase())),
    [conversations, q, user._id]
  )

  const toggle = (id) =>
    setSelected((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id)
      if (s.length >= 5) {
        toast.info('You can forward to up to 5 chats at once.')
        return s
      }
      return [...s, id]
    })

  const send = async () => {
    setBusy(true)
    try {
      await forwardMessage(message._id, selected)
      toast.success(`Forwarded to ${selected.length} chat${selected.length > 1 ? 's' : ''}`)
      onClose()
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={Boolean(message)}
      onClose={onClose}
      title="Forward message"
      subtitle="Choose up to 5 chats"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!selected.length} loading={busy} onClick={send}>Forward{selected.length ? ` (${selected.length})` : ''}</Button>
        </>
      }
    >
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-mute" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats" className="h-11 w-full rounded-xl border border-line bg-card pl-11 pr-4 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15" />
      </div>
      <div className="scroll-thin -mx-2 h-64 overflow-y-auto px-2">
        {list.length === 0 && <p className="py-10 text-center text-sm text-mute">No chats to show.</p>}
        {list.map((c) => {
          const on = selected.includes(c._id)
          const title = convTitle(c, user._id)
          return (
            <button key={c._id} onClick={() => toggle(c._id)} className={cn('flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition', on ? 'bg-brand-500/10' : 'hover:bg-soft')}>
              <Avatar src={convAvatar(c, user._id)} name={title} size="md" group={c.isGroup} />
              <span className="font-display min-w-0 flex-1 truncate text-xl">{title}</span>
              <span className={cn('flex h-6 w-6 items-center justify-center rounded-full border transition', on ? 'border-transparent bg-brand-gradient text-white' : 'border-line')}>
                {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
            </button>
          )
        })}
      </div>
    </Modal>
  )
}
