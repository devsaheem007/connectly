import { memo, useState } from 'react'
import { Copy, CornerUpLeft, FileText, Forward, MoreHorizontal, Pencil, RotateCw, Trash2, X } from 'lucide-react'
import Avatar from '../ui/Avatar'
import FloatingMenu from '../ui/FloatingMenu'
import { MenuItem } from '../ui/misc'
import Ticks from './Ticks'
import { assetUrl } from '../../lib/api'
import { QUICK_REACTIONS } from '../../lib/emoji'
import { cn, colorFor, formatBytes, formatTime, splitLinks } from '../../lib/utils'

function Attachments({ items, mine, onOpenImage }) {
  const images = items.filter((a) => a.kind === 'image')
  const others = items.filter((a) => a.kind !== 'image')
  return (
    <div className="space-y-1.5">
      {images.length > 0 && (
        <div className={cn('grid gap-1 overflow-hidden rounded-xl', images.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
          {images.map((img, i) => (
            <button key={img.url} onClick={() => onOpenImage(img)} className={cn('group/img relative overflow-hidden bg-black/10', images.length === 1 ? 'max-h-80' : 'aspect-square', images.length === 3 && i === 0 && 'col-span-2 aspect-video')}>
              <img src={assetUrl(img.url)} alt={img.name} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover/img:scale-105" />
            </button>
          ))}
        </div>
      )}
      {others.map((a) =>
        a.kind === 'video' ? (
          <video key={a.url} src={assetUrl(a.url)} controls preload="metadata" className="max-h-72 w-full rounded-xl bg-black" />
        ) : a.kind === 'audio' ? (
          <audio key={a.url} src={assetUrl(a.url)} controls preload="metadata" className="h-10 w-64 max-w-full" />
        ) : (
          <a
            key={a.url}
            href={assetUrl(a.url)}
            target="_blank"
            rel="noreferrer"
            download={a.name}
            className={cn('flex items-center gap-3 rounded-xl p-2.5 pr-4 transition', mine ? 'bg-white/15 hover:bg-white/25' : 'bg-soft hover:bg-line/60')}
          >
            <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', mine ? 'bg-white/20' : 'bg-brand-500/12 text-brand-600')}>
              <FileText className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block max-w-48 truncate text-sm font-semibold">{a.name}</span>
              <span className={cn('block text-xs', mine ? 'text-white/75' : 'text-mute')}>{formatBytes(a.size)}</span>
            </span>
          </a>
        )
      )}
    </div>
  )
}

function ReplyQuote({ reply, mine, onJump }) {
  if (!reply) return null
  const label = reply.missing ? 'Original message unavailable' : reply.isDeleted ? '🚫 This message was deleted' : reply.text || (reply.attachment ? (reply.attachment.kind === 'image' ? '📷 Photo' : `📎 ${reply.attachment.name || 'Attachment'}`) : '')
  return (
    <button
      onClick={() => !reply.missing && onJump(reply._id)}
      className={cn('mb-1.5 block w-full rounded-lg border-l-[3px] px-2.5 py-1.5 text-left transition', mine ? 'border-white/70 bg-white/15 hover:bg-white/25' : 'border-brand-500 bg-brand-500/8 hover:bg-brand-500/14')}
    >
      {reply.sender?.name && (
        <span className="block text-xs font-bold" style={{ color: mine ? 'rgba(255,255,255,.95)' : colorFor(reply.sender._id) }}>
          {reply.sender.name}
        </span>
      )}
      <span className={cn('line-clamp-2 text-[13px]', mine ? 'text-white/85' : 'text-mute')}>{label}</span>
    </button>
  )
}

function MessageBubble({ msg, conv, meId, status, isFirst, isLast, showSender, onReply, onEdit, onDelete, onForward, onReact, onJump, onOpenImage, onRetry, onDiscard, toast }) {
  const mine = String(msg.sender?._id) === String(meId)
  const [anchor, setAnchor] = useState(null)
  const failed = msg._status === 'failed'
  const sending = msg._status === 'sending'

  if (msg.type === 'system') {
    return (
      <div data-mid={msg._id} className="my-3 flex justify-center">
        <span className="rounded-full bg-soft px-4 py-1.5 text-center text-xs font-medium italic text-mute">{msg.text}</span>
      </div>
    )
  }

  const reactions = Object.values(
    (msg.reactions || []).reduce((acc, r) => {
      acc[r.emoji] = acc[r.emoji] || { emoji: r.emoji, users: [] }
      acc[r.emoji].users.push(r.user)
      return acc
    }, {})
  )
  const myReaction = msg.reactions?.find((r) => String(r.user) === String(meId))?.emoji
  const canAct = !sending && !failed

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(msg.text)
      toast?.success('Copied to clipboard')
    } catch {
      toast?.error('Could not copy')
    }
  }
  const close = () => setAnchor(null)
  const run = (fn) => () => (close(), fn())

  return (
    <div data-mid={msg._id} className={cn('group/msg relative flex items-end gap-2 rounded-2xl px-1 py-[1.5px] transition-colors', mine ? 'justify-end' : 'justify-start', isFirst && 'mt-2.5')}>
      {!mine && conv.isGroup && (
        <span className="w-8 shrink-0">{isLast && <Avatar src={msg.sender?.avatar} name={msg.sender?.name || ''} size="sm" />}</span>
      )}

      {/* hover actions (desktop) */}
      {canAct && !msg.isDeleted && (
        <div className={cn('flex items-center gap-0.5 self-center opacity-0 transition group-hover/msg:opacity-100 max-md:hidden', mine ? 'order-first' : 'order-last')}>
          <button onClick={() => onReply(msg)} className="rounded-full p-1.5 text-mute transition hover:bg-soft hover:text-ink" title="Reply" aria-label="Reply">
            <CornerUpLeft className="h-4 w-4" />
          </button>
          <button onClick={(e) => setAnchor(e.currentTarget)} className="rounded-full p-1.5 text-mute transition hover:bg-soft hover:text-ink" title="More" aria-label="More options">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className={cn('flex max-w-[82%] flex-col sm:max-w-[72%]', mine ? 'items-end' : 'items-start')}>
        <div
          onContextMenu={(e) => {
            if (!canAct || msg.isDeleted) return
            e.preventDefault()
            setAnchor(e.currentTarget)
          }}
          onDoubleClick={() => canAct && !msg.isDeleted && onReact(msg, '❤️')}
          className={cn(
            'relative min-w-0 max-w-full break-words px-3.5 py-2 text-[15px] leading-relaxed shadow-soft',
            mine ? 'bg-brand-gradient text-white' : 'border border-line bg-card text-ink',
            mine ? 'rounded-2xl' : 'rounded-2xl',
            mine && !isFirst && 'rounded-tr-md',
            mine && !isLast && 'rounded-br-md',
            !mine && !isFirst && 'rounded-tl-md',
            !mine && !isLast && 'rounded-bl-md',
            sending && 'opacity-70',
            failed && 'ring-2 ring-rose-400/60'
          )}
        >
          {showSender && !mine && conv.isGroup && (
            <p className="mb-0.5 text-[13px] font-bold" style={{ color: colorFor(msg.sender?._id || '') }}>
              {msg.sender?.name}
            </p>
          )}
          {msg.forwarded && !msg.isDeleted && (
            <p className={cn('mb-1 flex items-center gap-1 text-xs italic', mine ? 'text-white/75' : 'text-mute')}>
              <Forward className="h-3 w-3" /> Forwarded
            </p>
          )}

          {msg.isDeleted ? (
            <p className={cn('flex items-center gap-1.5 italic', mine ? 'text-white/80' : 'text-mute')}>
              <span>🚫</span> This message was deleted
            </p>
          ) : (
            <>
              <ReplyQuote reply={msg.replyTo} mine={mine} onJump={onJump} />
              {msg.attachments?.length > 0 && <Attachments items={msg.attachments} mine={mine} onOpenImage={(img) => onOpenImage(msg, img)} />}
              {msg.text && (
                <p className={cn('whitespace-pre-wrap', msg.attachments?.length && 'mt-1.5')}>
                  {splitLinks(msg.text).map((p, i) =>
                    p.link ? (
                      <a key={i} href={p.text} target="_blank" rel="noreferrer noopener" className={cn('break-all underline underline-offset-2', mine ? 'text-white' : 'text-brand-600')}>
                        {p.text}
                      </a>
                    ) : (
                      <span key={i}>{p.text}</span>
                    )
                  )}
                </p>
              )}
            </>
          )}

          <span className={cn('float-right ml-3 mt-1.5 inline-flex translate-y-[3px] select-none items-center gap-1 text-[11px]', mine ? 'text-white/75' : 'text-mute')}>
            {msg.editedAt && !msg.isDeleted && <em>edited</em>}
            {formatTime(msg.createdAt)}
            {mine && <Ticks status={status} onDark />}
          </span>
        </div>

        {reactions.length > 0 && (
          <div className={cn('-mt-1.5 flex flex-wrap gap-1', mine ? 'justify-end pr-2' : 'pl-2')}>
            {reactions.map((r) => {
              const iReacted = r.users.some((u) => String(u) === String(meId))
              return (
                <button
                  key={r.emoji}
                  onClick={() => onReact(msg, r.emoji)}
                  className={cn('animate-pop flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs shadow-soft transition hover:scale-110', iReacted ? 'border-brand-300 bg-brand-100 dark:bg-brand-500/25' : 'border-line bg-card')}
                >
                  <span className="text-sm leading-none">{r.emoji}</span>
                  {r.users.length > 1 && <b className="font-semibold">{r.users.length}</b>}
                </button>
              )
            })}
          </div>
        )}

        {failed && (
          <div className="mt-1 flex items-center gap-3 text-xs font-semibold text-rose-500">
            <span>{msg._error || 'Not sent'}</span>
            <button onClick={() => onRetry(msg)} className="flex items-center gap-1 underline"><RotateCw className="h-3 w-3" /> Retry</button>
            <button onClick={() => onDiscard(msg)} className="flex items-center gap-1 underline"><X className="h-3 w-3" /> Discard</button>
          </div>
        )}
      </div>

      {/* mobile: tap the small button for everything */}
      {canAct && !msg.isDeleted && (
        <button
          onClick={(e) => setAnchor(e.currentTarget)}
          className={cn('self-center rounded-full p-1 text-mute/60 md:hidden', mine ? 'order-first' : 'order-last')}
          aria-label="Message options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      )}

      {anchor && (
        <FloatingMenu anchor={anchor} onClose={close}>
          <div className="mb-1 flex items-center justify-between gap-1 rounded-xl bg-soft px-2 py-1.5">
            {QUICK_REACTIONS.map((e) => (
              <button
                key={e}
                onClick={run(() => onReact(msg, e))}
                className={cn('rounded-full p-1 text-[22px] leading-none transition hover:scale-125', myReaction === e && 'bg-brand-500/20')}
              >
                {e}
              </button>
            ))}
          </div>
          <MenuItem icon={CornerUpLeft} onClick={run(() => onReply(msg))}>Reply</MenuItem>
          {msg.text && <MenuItem icon={Copy} onClick={run(copy)}>Copy text</MenuItem>}
          <MenuItem icon={Forward} onClick={run(() => onForward(msg))}>Forward</MenuItem>
          {mine && msg.text && !msg.attachments?.length && <MenuItem icon={Pencil} onClick={run(() => onEdit(msg))}>Edit</MenuItem>}
          <MenuItem icon={Trash2} danger onClick={run(() => onDelete(msg))}>Delete</MenuItem>
        </FloatingMenu>
      )}
    </div>
  )
}

export default memo(MessageBubble)
