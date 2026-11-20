import Conversation from '../models/Conversation.js'
import Message from '../models/Message.js'
import { serializeMessage } from '../utils/serializers.js'
import { emitToUsers, isOnline } from '../socket/io.js'

export const populateMessage = (query) =>
  query
    .populate('sender', 'name username avatar')
    .populate({ path: 'replyTo', select: 'text sender type attachments isDeleted', populate: { path: 'sender', select: 'name username' } })

/**
 * Creates a message, updates the conversation, marks delivery for online members
 * and pushes the message to every member in real time.
 */
export async function createMessage({ conversation, senderId, text = '', type = 'text', attachments = [], replyTo = null, forwarded = false }) {
  const members = conversation.members.map((m) => String(m.user?._id || m.user))
  const recipients = members.filter((m) => m !== String(senderId))
  const onlineRecipients = type === 'system' ? [] : recipients.filter(isOnline)

  const msg = await Message.create({
    conversation: conversation._id,
    sender: senderId,
    type,
    text,
    attachments,
    replyTo,
    forwarded,
    readBy: [senderId],
    deliveredTo: onlineRecipients,
  })

  await Conversation.updateOne(
    { _id: conversation._id },
    { $set: { lastMessage: msg._id, lastActivity: msg.createdAt }, ...(recipients.length ? { $pull: { archivedBy: { $in: recipients } } } : {}) }
  )

  const full = await populateMessage(Message.findById(msg._id))
  const payload = serializeMessage(full)
  emitToUsers(members, 'message:new', payload)
  return payload
}

export async function emitMessageUpdate(conversationId, messageDoc) {
  const conv = await Conversation.findById(conversationId).select('members')
  if (!conv) return
  const full = await populateMessage(Message.findById(messageDoc._id))
  const payload = serializeMessage(full)
  emitToUsers(conv.members.map((m) => String(m.user)), 'message:updated', payload)
  return payload
}
