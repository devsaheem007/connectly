import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, Loader2, MessageCircleHeart, RefreshCw } from 'lucide-react'
import MessageBubble from './MessageBubble'
import Lightbox from './Lightbox'
import { EmptyState, Spinner } from '../ui/misc'
import { useChat } from '../../context/ChatContext'
import { useToast } from '../../context/ToastContext'
import { dayLabel, messageStatus, sameDay } from '../../lib/utils'
import { errMsg } from '../../lib/api'

const CLUSTER_MS = 4 * 60 * 1000

export default function MessageList({ conv, meId, onReply, onEdit, onDelete, onForward }) {
  const { msgs, loadOlder, jumpToMessage, jumpToLatest, reactToMessage, retryMessage, discardMessage, typing } = useChat()
  const toast = useToast()
  const entry = msgs[conv._id]
  const items = useMemo(() => entry?.items || [], [entry?.items])
  const scroller = useRef(null)
  const stick = useRef(true)
  const prevHeight = useRef(0)
  const lastId = useRef(null)
  const initial = useRef(true)
  const [showDown, setShowDown] = useState(false)
  const [below, setBelow] = useState(0)
  const [lightbox, setLightbox] = useState(null)

  const typers = Object.keys(typing[conv._id] || {})
    .map((id) => conv.members.find((m) => String(m.user?._id) === id)?.user)
    .filter(Boolean)

  const images = useMemo(() => items.flatMap((m) => (m.isDeleted ? [] : m.attachments?.filter((a) => a.kind === 'image').map((a) => ({ ...a, _mid: m._id })) || [])), [items])

  const toBottom = useCallback((smooth = false) => {
    const el = scroller.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight
    stick.current = dist < 140
    setShowDown(dist > 320)
    if (dist < 140) setBelow(0)
    if (el.scrollTop < 160 && entry?.hasMore && !entry.loadingOlder && entry.status === 'ready') {
      prevHeight.current = el.scrollHeight
      loadOlder(conv._id)
    }
  }

  // first paint of a conversation → jump to the bottom without animation
  useLayoutEffect(() => {
    if (entry?.status === 'ready' && initial.current && !entry.focusId) {
      toBottom()
      initial.current = false
      lastId.current = items[items.length - 1]?._id ?? null
    }
  }, [entry?.status, entry?.focusId, items, toBottom])

  // keep position after older messages are prepended
  useLayoutEffect(() => {
    const el = scroller.current
    if (el && entry?.prepended && prevHeight.current) {
      el.scrollTop += el.scrollHeight - prevHeight.current
      prevHeight.current = 0
    }
  }, [entry?.prepended])

  // a new message arrived at the end (older pages prepended at the top don't count)
  useLayoutEffect(() => {
    if (initial.current) return
    const last = items[items.length - 1]
    if (!last || last._id === lastId.current) return
    const replacedTemp = String(lastId.current).startsWith('tmp-')
    lastId.current = last._id
    const mine = String(last.sender?._id) === String(meId)
    if (stick.current || mine) toBottom(true)
    else if (!mine && !replacedTemp && last.type !== 'system') setBelow((b) => b + 1)
  }, [items, meId, toBottom])

  // typing bubble appearing near the bottom should keep us pinned
  useEffect(() => {
    if (stick.current) toBottom(true)
  }, [typers.length, toBottom])

  // jump to a specific message and flash it
  useEffect(() => {
    if (!entry?.focusId || entry.status !== 'ready') return
    const t = setTimeout(() => {
      const node = scroller.current?.querySelector(`[data-mid="${entry.focusId}"]`)
      if (!node) return
      node.scrollIntoView({ block: 'center', behavior: initial.current ? 'auto' : 'smooth' })
      initial.current = false
      lastId.current = items[items.length - 1]?._id ?? null
      node.classList.remove('animate-msg-flash')
      void node.offsetWidth
      node.classList.add('animate-msg-flash')
      setTimeout(() => node.classList.remove('animate-msg-flash'), 1700)
    }, 60)
    return () => clearTimeout(t)
  }, [entry?.focusId, entry?.focusNonce, entry?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  const onReact = useCallback(
    async (msg, emoji) => {
      try {
        await reactToMessage(msg._id, emoji)
      } catch (e) {
        toast.error(errMsg(e))
      }
    },
    [reactToMessage, toast]
  )
  const onJump = useCallback((id) => jumpToMessage(conv._id, id), [conv._id, jumpToMessage])
  const onRetry = useCallback((m) => retryMessage(conv._id, m._id), [conv._id, retryMessage])
  const onDiscard = useCallback((m) => discardMessage(conv._id, m._id), [conv._id, discardMessage])
  const onOpenImage = useCallback((msg, img) => setLightbox(images.findIndex((i) => i._mid === msg._id && i.url === img.url)), [images])

  if (!entry || entry.status === 'loading' && !items.length) {
    return (
      <div className="chat-bg flex flex-1 items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    )
  }
  if (entry.status === 'error' && !items.length) {
    return (
      <div className="chat-bg flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-mute">{entry.error}</p>
        <button onClick={() => jumpToLatest(conv._id)} className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white">
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
      </div>
    )
  }

  return (
    <div className="chat-bg relative min-h-0 flex-1">
      <div ref={scroller} onScroll={onScroll} className="scroll-thin h-full overflow-y-auto overscroll-contain px-3 pb-3 pt-2 sm:px-6">
        {entry.hasMore && (
          <div className="flex justify-center py-3">{entry.loadingOlder ? <Loader2 className="h-5 w-5 animate-spin text-brand-500" /> : <span className="text-xs text-mute">Scroll up for older messages</span>}</div>
        )}

        {items.length === 0 && (
          <EmptyState
            icon={MessageCircleHeart}
            title={conv.isGroup ? 'A fresh group' : 'Say hello'}
            text={conv.isGroup ? 'Be the first to post something in this group.' : 'This is the very beginning of your conversation. Send the first message!'}
            className="h-full"
          />
        )}

        {items.map((m, i) => {
          const prev = items[i - 1]
          const next = items[i + 1]
          const newDay = !prev || !sameDay(prev.createdAt, m.createdAt)
          const sameCluster = (a, b) => a && b && a.type !== 'system' && b.type !== 'system' && String(a.sender?._id) === String(b.sender?._id) && sameDay(a.createdAt, b.createdAt) && Math.abs(new Date(b.createdAt) - new Date(a.createdAt)) < CLUSTER_MS
          const isFirst = !sameCluster(prev, m) || newDay
          const isLast = !sameCluster(m, next)
          return (
            <div key={m._id}>
              {newDay && (
                <div className="sticky top-1 z-10 my-3 flex justify-center">
                  <span className="glass shadow-soft rounded-full px-3.5 py-1 text-xs font-semibold italic text-mute">{dayLabel(m.createdAt)}</span>
                </div>
              )}
              <MessageBubble
                msg={m}
                conv={conv}
                meId={meId}
                status={messageStatus(m, conv, meId)}
                isFirst={isFirst}
                isLast={isLast}
                showSender={isFirst}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                onForward={onForward}
                onReact={onReact}
                onJump={onJump}
                onOpenImage={onOpenImage}
                onRetry={onRetry}
                onDiscard={onDiscard}
                toast={toast}
              />
            </div>
          )
        })}

        {typers.length > 0 && (
          <div className="animate-slide-up mt-2 flex items-end gap-2 px-1">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-line bg-card px-4 py-3 shadow-soft" aria-label={`${typers.map((t) => t.name).join(', ')} typing`}>
              {[0, 1, 2].map((i) => (
                <span key={i} className="typing-dot h-2 w-2 rounded-full bg-mute" style={{ animationDelay: `${i * 0.16}s` }} />
              ))}
            </div>
            {conv.isGroup && <span className="pb-1 text-xs italic text-mute">{typers.map((t) => t.name.split(' ')[0]).join(', ')} typing…</span>}
          </div>
        )}
      </div>

      {(showDown || entry.detached) && (
        <button
          onClick={() => (entry.detached ? jumpToLatest(conv._id) : toBottom(true))}
          className="animate-pop glass shadow-lift absolute bottom-4 right-5 flex items-center gap-2 rounded-full py-2.5 pl-3.5 pr-4 text-sm font-semibold transition hover:scale-105"
        >
          <ArrowDown className="h-4 w-4" />
          {entry.detached ? 'Jump to latest' : below > 0 ? `${below} new` : 'Latest'}
          {below > 0 && !entry.detached && <span className="bg-brand-gradient h-2 w-2 rounded-full" />}
        </button>
      )}

      <Lightbox images={images} index={lightbox >= 0 ? lightbox : null} onClose={() => setLightbox(null)} onIndex={setLightbox} />
    </div>
  )
}
