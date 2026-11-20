import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { FileText, Loader2, Paperclip, Pencil, Send, Smile, X } from 'lucide-react'
import EmojiPicker from './EmojiPicker'
import { api, errMsg } from '../../lib/api'
import { cn, formatBytes } from '../../lib/utils'
import { useChat } from '../../context/ChatContext'
import { useToast } from '../../context/ToastContext'

const MAX_LEN = 5000
const MAX_FILES = 6
const MAX_SIZE = 15 * 1024 * 1024
const drafts = new Map() // conversationId -> unsent text (kept while the app is open)

const Composer = forwardRef(function Composer({ conv, replyTo, editing, onCancelReply, onCancelEdit, meId }, ref) {
  const { sendMessage, editMessage, sendTyping } = useChat()
  const toast = useToast()
  const [text, setText] = useState(() => drafts.get(conv._id) || '')
  const [files, setFiles] = useState([]) // {id, name, size, kind, status, attachment, preview}
  const [emoji, setEmoji] = useState(false)
  const [busy, setBusy] = useState(false)
  const area = useRef(null)
  const fileInput = useRef(null)
  const typingRef = useRef({ on: false, timer: null })
  const touch = useRef(false)

  useEffect(() => {
    touch.current = window.matchMedia('(pointer: coarse)').matches
  }, [])

  const grow = useCallback(() => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [])
  useEffect(grow, [text, grow])

  // stop "typing…" when leaving the chat; remember the draft
  useEffect(() => {
    const t = typingRef.current
    const id = conv._id
    return () => {
      clearTimeout(t.timer)
      if (t.on) sendTyping(id, false)
      t.on = false
    }
  }, [conv._id, sendTyping])

  useEffect(() => {
    if (editing) {
      setText(editing.text)
      setTimeout(() => area.current?.focus(), 30)
    }
  }, [editing])
  useEffect(() => {
    if (replyTo) area.current?.focus()
  }, [replyTo])

  const setDraft = (v) => {
    setText(v)
    if (!editing) drafts.set(conv._id, v)
  }

  const pingTyping = (value) => {
    const t = typingRef.current
    clearTimeout(t.timer)
    if (!value.trim()) {
      if (t.on) sendTyping(conv._id, false)
      t.on = false
      return
    }
    if (!t.on) {
      sendTyping(conv._id, true)
      t.on = true
    }
    t.timer = setTimeout(() => {
      sendTyping(conv._id, false)
      t.on = false
    }, 2500)
  }

  const addFiles = useCallback(
    async (list) => {
      if (editing) return
      const chosen = Array.from(list || [])
      if (!chosen.length) return
      const room = MAX_FILES - files.length
      if (room <= 0) return toast.info(`You can attach up to ${MAX_FILES} files at once.`)
      const accepted = []
      for (const f of chosen.slice(0, room)) {
        if (f.size > MAX_SIZE) {
          toast.error(`“${f.name}” is larger than 15 MB.`)
          continue
        }
        accepted.push(f)
      }
      if (chosen.length > room) toast.info(`Only ${MAX_FILES} files per message — extra files were skipped.`)
      if (!accepted.length) return

      const entries = accepted.map((f) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file: f,
        name: f.name,
        size: f.size,
        kind: f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : f.type.startsWith('audio/') ? 'audio' : 'file',
        status: 'uploading',
        progress: 0,
        preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
      }))
      setFiles((cur) => [...cur, ...entries])

      await Promise.all(
        entries.map(async (en) => {
          try {
            const fd = new FormData()
            fd.append('files', en.file)
            const { data } = await api.post('/upload/files', fd, {
              timeout: 120000,
              onUploadProgress: (p) => setFiles((cur) => cur.map((x) => (x.id === en.id ? { ...x, progress: p.total ? Math.round((p.loaded / p.total) * 100) : 0 } : x))),
            })
            setFiles((cur) => cur.map((x) => (x.id === en.id ? { ...x, status: 'done', attachment: data.attachments[0] } : x)))
          } catch (e) {
            toast.error(`${en.name}: ${errMsg(e)}`)
            setFiles((cur) => cur.filter((x) => x.id !== en.id))
          }
        })
      )
    },
    [editing, files.length, toast]
  )

  useImperativeHandle(ref, () => ({ addFiles, focus: () => area.current?.focus() }), [addFiles])

  const removeFile = (id) =>
    setFiles((cur) => {
      const f = cur.find((x) => x.id === id)
      if (f?.preview) URL.revokeObjectURL(f.preview)
      return cur.filter((x) => x.id !== id)
    })

  const uploading = files.some((f) => f.status === 'uploading')
  const canSend = !busy && !uploading && (text.trim().length > 0 || (files.length > 0 && !editing))

  const submit = async () => {
    if (!canSend) return
    const value = text.trim()
    if (value.length > MAX_LEN) return toast.error(`Messages can be up to ${MAX_LEN} characters.`)

    if (editing) {
      if (value === editing.text) return onCancelEdit()
      setBusy(true)
      try {
        await editMessage(editing._id, value)
        onCancelEdit()
        setText(drafts.get(conv._id) || '')
      } catch (e) {
        toast.error(errMsg(e))
      } finally {
        setBusy(false)
      }
      return
    }

    const attachments = files.map((f) => f.attachment).filter(Boolean)
    const reply = replyTo
    files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview))
    setText('')
    setFiles([])
    drafts.delete(conv._id)
    setEmoji(false)
    onCancelReply()
    pingTyping('')
    requestAnimationFrame(() => area.current?.focus())
    sendMessage(conv._id, { text: value, attachments, replyTo: reply })
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !touch.current && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
    if (e.key === 'Escape') {
      if (emoji) setEmoji(false)
      else if (editing) {
        onCancelEdit()
        setText(drafts.get(conv._id) || '')
      } else if (replyTo) onCancelReply()
    }
  }

  const onPaste = (e) => {
    const pasted = Array.from(e.clipboardData?.files || [])
    if (pasted.length) {
      e.preventDefault()
      addFiles(pasted)
    }
  }

  const insertEmoji = (emojiChar) => {
    const el = area.current
    const start = el?.selectionStart ?? text.length
    const end = el?.selectionEnd ?? text.length
    const next = text.slice(0, start) + emojiChar + text.slice(end)
    setDraft(next)
    pingTyping(next)
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + emojiChar.length, start + emojiChar.length)
    })
  }

  const replyLabel = replyTo && (replyTo.text || (replyTo.attachments?.[0] ? (replyTo.attachments[0].kind === 'image' ? '📷 Photo' : `📎 ${replyTo.attachments[0].name}`) : ''))

  return (
    <div className="safe-bottom relative border-t border-line bg-card/80 backdrop-blur-xl">
      {(replyTo || editing) && (
        <div className="animate-slide-up mx-3 mt-3 flex items-center gap-3 rounded-2xl border-l-[3px] border-brand-500 bg-brand-500/8 px-3.5 py-2 sm:mx-5">
          {editing ? <Pencil className="h-4 w-4 shrink-0 text-brand-600" /> : null}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-brand-600">{editing ? 'Editing message' : `Replying to ${String(replyTo.sender?._id) === String(meId) ? 'yourself' : replyTo.sender?.name}`}</p>
            <p className="truncate text-[13px] text-mute">{editing ? editing.text : replyLabel}</p>
          </div>
          <button
            onClick={() => {
              if (editing) {
                onCancelEdit()
                setText(drafts.get(conv._id) || '')
              } else onCancelReply()
            }}
            className="rounded-full p-1.5 text-mute transition hover:bg-soft hover:text-ink"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {files.length > 0 && (
        <div className="scroll-thin mx-3 mt-3 flex gap-2.5 overflow-x-auto pb-1 sm:mx-5">
          {files.map((f) => (
            <div key={f.id} className="animate-pop relative shrink-0">
              {f.preview ? (
                <img src={f.preview} alt={f.name} className="h-20 w-20 rounded-2xl border border-line object-cover" />
              ) : (
                <div className="flex h-20 w-40 items-center gap-2.5 rounded-2xl border border-line bg-soft px-3">
                  <FileText className="h-6 w-6 shrink-0 text-brand-500" />
                  <span className="min-w-0 text-xs">
                    <b className="block truncate">{f.name}</b>
                    <span className="text-mute">{formatBytes(f.size)}</span>
                  </span>
                </div>
              )}
              {f.status === 'uploading' && (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-2xl bg-black/55 text-xs font-bold text-white">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {f.progress}%
                </span>
              )}
              <button onClick={() => removeFile(f.id)} className="absolute -right-1.5 -top-1.5 rounded-full bg-ink p-1 text-paper shadow-soft" aria-label={`Remove ${f.name}`}>
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-1.5 px-3 py-3 sm:gap-2 sm:px-5">
        <div className="relative">
          <button onClick={() => setEmoji((e) => !e)} className={cn('rounded-full p-2.5 transition hover:bg-soft', emoji ? 'text-brand-600' : 'text-mute hover:text-ink')} aria-label="Emoji" data-cursor="Emoji">
            <Smile className="h-6 w-6" />
          </button>
          {emoji && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setEmoji(false)} />
              <EmojiPicker onPick={insertEmoji} className="absolute bottom-14 left-0 z-40 origin-bottom-left" />
            </>
          )}
        </div>

        {!editing && (
          <>
            <button onClick={() => fileInput.current?.click()} className="rounded-full p-2.5 text-mute transition hover:bg-soft hover:text-ink" aria-label="Attach files" data-cursor="Attach">
              <Paperclip className="h-6 w-6" />
            </button>
            <input
              ref={fileInput}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </>
        )}

        <div className="relative min-w-0 flex-1">
          <textarea
            ref={area}
            value={text}
            rows={1}
            maxLength={MAX_LEN + 200}
            onChange={(e) => {
              setDraft(e.target.value)
              pingTyping(e.target.value)
            }}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onBlur={() => typingRef.current.on && (clearTimeout(typingRef.current.timer), sendTyping(conv._id, false), (typingRef.current.on = false))}
            placeholder={editing ? 'Edit your message…' : 'Write a message…'}
            className="scroll-thin max-h-40 w-full resize-none rounded-[1.4rem] border border-transparent bg-soft px-4 py-3 text-[15px] leading-snug outline-none transition placeholder:text-mute focus:border-brand-300 focus:bg-card focus:ring-4 focus:ring-brand-500/12"
          />
          {text.length > MAX_LEN - 300 && <span className={cn('pointer-events-none absolute -top-5 right-2 text-[11px] font-semibold', text.length > MAX_LEN ? 'text-rose-500' : 'text-mute')}>{text.length}/{MAX_LEN}</span>}
        </div>

        <button
          onClick={submit}
          disabled={!canSend}
          className="bg-brand-gradient shadow-glow flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white transition hover:brightness-110 active:scale-90 disabled:opacity-40 disabled:shadow-none"
          aria-label={editing ? 'Save edit' : 'Send message'}
          data-cursor="Send"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 -translate-x-px translate-y-px" />}
        </button>
      </div>
    </div>
  )
})

export default Composer
