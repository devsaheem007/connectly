export const cn = (...parts) => parts.flat().filter(Boolean).join(' ')

export const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || '?'

const GRADIENTS = [
  ['#6366f1', '#ec4899'],
  ['#0ea5e9', '#6366f1'],
  ['#10b981', '#0ea5e9'],
  ['#f59e0b', '#ef4444'],
  ['#8b5cf6', '#ec4899'],
  ['#14b8a6', '#84cc16'],
  ['#f43f5e', '#f59e0b'],
  ['#3b82f6', '#14b8a6'],
]
export function gradientFor(seed = '') {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  const [a, b] = GRADIENTS[h % GRADIENTS.length]
  return `linear-gradient(135deg, ${a}, ${b})`
}
export function colorFor(seed = '') {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return `hsl(${h % 360} 62% 48%)`
}

export const formatTime = (d) => new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

const startOfDay = (d) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.getTime()
}

export function dayLabel(d) {
  const diff = Math.round((startOfDay(Date.now()) - startOfDay(d)) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return new Date(d).toLocaleDateString([], { weekday: 'long' })
  return new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short', year: new Date(d).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })
}

/** Short stamp for the conversation list. */
export function listStamp(d) {
  if (!d) return ''
  const diff = Math.round((startOfDay(Date.now()) - startOfDay(d)) / 86400000)
  if (diff === 0) return formatTime(d)
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return new Date(d).toLocaleDateString([], { weekday: 'short' })
  return new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short' })
}

export function lastSeenLabel(d) {
  if (!d) return 'offline'
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (mins < 1) return 'last seen just now'
  if (mins < 60) return `last seen ${mins}m ago`
  const sameDay = startOfDay(d) === startOfDay(Date.now())
  if (sameDay) return `last seen today at ${formatTime(d)}`
  return `last seen ${dayLabel(d).toLowerCase()} at ${formatTime(d)}`
}

export function formatBytes(n = 0) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export const sameDay = (a, b) => startOfDay(a) === startOfDay(b)

/** The "other person" in a direct chat. */
export const otherMember = (conv, meId) => conv?.members?.find((m) => String(m.user?._id) !== String(meId))?.user || null

export function convTitle(conv, meId) {
  if (!conv) return ''
  if (conv.isGroup) return conv.name
  return otherMember(conv, meId)?.name || 'Deleted user'
}

export function convAvatar(conv, meId) {
  if (conv.isGroup) return conv.avatar
  return otherMember(conv, meId)?.avatar || null
}

/** One-line preview of a message for the conversation list / reply bar / notifications. */
export function previewOf(m, meId, { withSender = false } = {}) {
  if (!m) return ''
  if (m.type === 'system') return m.text
  let body
  if (m.isDeleted) body = '🚫 This message was deleted'
  else if (m.attachments?.length) {
    const a = m.attachments[0]
    const label = a.kind === 'image' ? '📷 Photo' : a.kind === 'video' ? '🎬 Video' : a.kind === 'audio' ? '🎵 Audio' : `📎 ${a.name || 'File'}`
    body = m.text ? `${label} · ${m.text}` : label
  } else body = m.text
  if (withSender && m.sender) {
    const mine = String(m.sender._id) === String(meId)
    return `${mine ? 'You' : m.sender.name?.split(' ')[0]}: ${body}`
  }
  return body
}

export function messageStatus(msg, conv, meId) {
  if (msg._status === 'sending') return 'sending'
  if (msg._status === 'failed') return 'failed'
  const others = conv.members.map((m) => String(m.user?._id)).filter((id) => id !== String(meId))
  if (!others.length) return 'sent'
  if (others.every((id) => msg.seenBy?.includes(id))) return 'read'
  if (others.every((id) => msg.deliveredTo?.includes(id) || msg.seenBy?.includes(id))) return 'delivered'
  return 'sent'
}

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g
export function splitLinks(text = '') {
  return text.split(URL_RE).map((part, i) => ({ text: part, link: i % 2 === 1 }))
}
