import mongoose from 'mongoose'
import Conversation from '../models/Conversation.js'
import Message from '../models/Message.js'
import User from '../models/User.js'
import { userFromToken } from '../middleware/auth.js'
import { COOKIE_NAME } from '../utils/token.js'
import { emitToUser, emitToUsers, online, onlineIds, setIO } from './io.js'

/** Minimal Cookie header parser (avoids depending on a library's changing API). */
function parseCookies(header = '') {
  const out = {}
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i < 0) continue
    const key = part.slice(0, i).trim()
    const val = part.slice(i + 1).trim()
    try {
      out[key] = decodeURIComponent(val)
    } catch {
      out[key] = val
    }
  }
  return out
}

async function visibleOnlineIds() {
  const ids = onlineIds()
  if (!ids.length) return []
  const users = await User.find({ _id: { $in: ids }, 'privacy.showOnlineStatus': { $ne: false } }).select('_id')
  return users.map((u) => String(u._id))
}

/** Marks everything waiting for this user as "delivered" and tells the senders. */
async function markPendingDelivered(userId) {
  const convs = await Conversation.find({ 'members.user': userId }).select('_id')
  const pending = await Message.find({
    conversation: { $in: convs.map((c) => c._id) },
    sender: { $ne: userId },
    type: { $ne: 'system' },
    deliveredTo: { $ne: userId },
  }).select('_id conversation sender')
  if (!pending.length) return

  await Message.updateMany({ _id: { $in: pending.map((p) => p._id) } }, { $addToSet: { deliveredTo: userId } })

  const bySender = new Map()
  for (const p of pending) {
    const key = `${p.sender}|${p.conversation}`
    if (!bySender.has(key)) bySender.set(key, { sender: String(p.sender), conversationId: String(p.conversation), messageIds: [] })
    bySender.get(key).messageIds.push(String(p._id))
  }
  for (const g of bySender.values()) {
    emitToUser(g.sender, 'message:status', { conversationId: g.conversationId, messageIds: g.messageIds, userId: String(userId) })
  }
}

export function initSocket(io) {
  setIO(io)

  io.use(async (socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie || '')
      socket.data.user = await userFromToken(cookies[COOKIE_NAME])
      next()
    } catch (err) {
      next(new Error('Unauthorized'))
    }
  })

  io.on('connection', async (socket) => {
    const user = socket.data.user
    const uid = String(user._id)
    socket.join(`user:${uid}`)

    const wasOffline = !online.has(uid)
    if (!online.has(uid)) online.set(uid, new Set())
    online.get(uid).add(socket.id)

    try {
      socket.emit('presence:list', { online: await visibleOnlineIds() })
      if (wasOffline && user.privacy?.showOnlineStatus !== false) {
        socket.broadcast.emit('presence', { userId: uid, online: true, lastSeen: null })
      }
      await markPendingDelivered(uid)
    } catch (err) {
      console.error('socket connect error', err.message)
    }

    // typing indicator — relayed only to the other members of that conversation
    socket.on('typing', async ({ conversationId, isTyping } = {}) => {
      try {
        if (!mongoose.isValidObjectId(conversationId)) return
        const conv = await Conversation.findOne({ _id: conversationId, 'members.user': uid }).select('members.user')
        if (!conv) return
        const others = conv.members.map((m) => String(m.user)).filter((i) => i !== uid)
        emitToUsers(others, 'typing', { conversationId: String(conversationId), userId: uid, isTyping: Boolean(isTyping) })
      } catch {
        /* ignore */
      }
    })

    socket.on('disconnect', async () => {
      const set = online.get(uid)
      set?.delete(socket.id)
      if (set && set.size === 0) {
        online.delete(uid)
        const lastSeen = new Date()
        try {
          await User.updateOne({ _id: uid }, { $set: { lastSeen } })
          if (user.privacy?.showOnlineStatus !== false) {
            io.emit('presence', { userId: uid, online: false, lastSeen: user.privacy?.showLastSeen === false ? null : lastSeen })
          }
        } catch {
          /* ignore */
        }
      }
    })
  })
}
