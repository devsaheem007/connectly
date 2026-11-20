import mongoose from 'mongoose'
import Conversation from '../models/Conversation.js'
import Message from '../models/Message.js'
import User from '../models/User.js'
import { ApiError } from '../utils/ApiError.js'
import { USER_PUBLIC, serializeConversation } from '../utils/serializers.js'
import { emitToUser, emitToUsers } from '../socket/io.js'
import { removeStored } from '../utils/upload.js'

export const memberIds = (conv) => conv.members.map((m) => String(m.user?._id || m.user))

export const populateConv = (query) =>
  query
    .populate('members.user', USER_PUBLIC)
    .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'name username avatar' } })

/** Loads a conversation the user belongs to or throws 404. */
export async function getMemberConversation(conversationId, userId) {
  if (!mongoose.isValidObjectId(conversationId)) throw new ApiError(400, 'Invalid conversation id')
  const conv = await populateConv(Conversation.findOne({ _id: conversationId, 'members.user': userId }))
  if (!conv) throw new ApiError(404, 'Conversation not found')
  return conv
}

export const isGroupAdmin = (conv, userId) =>
  conv.members.some((m) => String(m.user?._id || m.user) === String(userId) && m.role === 'admin')

export async function unreadCounts(userId, conversationIds) {
  if (!conversationIds.length) return {}
  const rows = await Message.aggregate([
    {
      $match: {
        conversation: { $in: conversationIds.map((i) => new mongoose.Types.ObjectId(String(i))) },
        sender: { $ne: new mongoose.Types.ObjectId(String(userId)) },
        readBy: { $ne: new mongoose.Types.ObjectId(String(userId)) },
        deletedFor: { $ne: new mongoose.Types.ObjectId(String(userId)) },
        isDeleted: false,
        type: { $ne: 'system' },
      },
    },
    { $group: { _id: '$conversation', count: { $sum: 1 } } },
  ])
  return Object.fromEntries(rows.map((r) => [String(r._id), r.count]))
}

/** Sends the (per-member) conversation payload to every member through the socket. */
export async function broadcastConversation(convId, event, { only } = {}) {
  const conv = await populateConv(Conversation.findById(convId))
  if (!conv) return
  const targets = only || memberIds(conv)
  for (const uid of targets) emitToUser(uid, event, serializeConversation(conv, uid, 0))
}

/** Make sure a group still has at least one admin. */
export async function ensureAdmin(convId) {
  const conv = await Conversation.findById(convId)
  if (!conv || !conv.isGroup || !conv.members.length) return
  if (!conv.members.some((m) => m.role === 'admin')) {
    conv.members[0].role = 'admin'
    await conv.save()
  }
}

export async function destroyConversation(convId) {
  const msgs = await Message.find({ conversation: convId, 'attachments.0': { $exists: true } }).select('attachments')
  await Promise.all(msgs.flatMap((m) => m.attachments.map((a) => removeStored(a))))
  await Message.deleteMany({ conversation: convId })
  await Conversation.deleteOne({ _id: convId })
}

/** Removes a user and everything that should go with them. */
export async function deleteUserData(userId) {
  const uid = new mongoose.Types.ObjectId(String(userId))

  const directs = await Conversation.find({ isGroup: false, 'members.user': uid }).select('members')
  for (const c of directs) {
    const others = memberIds(c).filter((i) => i !== String(userId))
    await destroyConversation(c._id)
    emitToUsers(others, 'conversation:removed', { conversationId: String(c._id) })
  }

  const groups = await Conversation.find({ isGroup: true, 'members.user': uid }).select('_id members')
  for (const g of groups) {
    await Conversation.updateOne({ _id: g._id }, { $pull: { members: { user: uid }, pinnedBy: uid, archivedBy: uid, mutedBy: uid } })
    const after = await Conversation.findById(g._id)
    if (!after.members.length) await destroyConversation(g._id)
    else {
      await ensureAdmin(g._id)
      broadcastConversation(g._id, 'conversation:updated')
    }
  }

  await User.deleteOne({ _id: uid })
}
