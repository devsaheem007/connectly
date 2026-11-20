import mongoose from 'mongoose'
import Conversation from '../models/Conversation.js'
import Message from '../models/Message.js'
import User from '../models/User.js'
import { ApiError, asyncHandler } from '../utils/ApiError.js'
import { serializeConversation, serializeMessage } from '../utils/serializers.js'
import { emitToUser, emitToUsers } from '../socket/io.js'
import {
  broadcastConversation,
  destroyConversation,
  ensureAdmin,
  getMemberConversation,
  isGroupAdmin,
  memberIds,
  populateConv,
  unreadCounts,
} from '../services/conversationService.js'
import { createMessage, populateMessage } from '../services/messageService.js'

const MAX_GROUP_MEMBERS = 256
const MAX_PINS = 5

const uniqueIds = (ids = []) => [...new Set(ids.map(String))]

async function validUsers(ids) {
  const users = await User.find({ _id: { $in: ids }, isActive: true, isVerified: true }).select('name')
  if (users.length !== ids.length) throw new ApiError(400, 'One or more selected users could not be found')
  return users
}

export const listConversations = asyncHandler(async (req, res) => {
  const me = req.user._id
  const convs = await populateConv(Conversation.find({ 'members.user': me }).sort({ lastActivity: -1 }))
  const visible = convs.filter((c) => c.isGroup || c.lastMessage || String(c.createdBy) === String(me))
  const counts = await unreadCounts(me, visible.map((c) => c._id))
  res.json({ conversations: visible.map((c) => serializeConversation(c, me, counts[String(c._id)] || 0)) })
})

export const getConversation = asyncHandler(async (req, res) => {
  const conv = await getMemberConversation(req.params.id, req.user._id)
  const counts = await unreadCounts(req.user._id, [conv._id])
  res.json({ conversation: serializeConversation(conv, req.user._id, counts[String(conv._id)] || 0) })
})

export const createDirect = asyncHandler(async (req, res) => {
  const me = String(req.user._id)
  const other = String(req.body.userId)
  if (other === me) throw new ApiError(400, "You can't start a chat with yourself")
  await validUsers([other])

  const directKey = [me, other].sort().join('_')
  let conv = await Conversation.findOne({ directKey })
  if (!conv) {
    try {
      conv = await Conversation.create({
        isGroup: false,
        directKey,
        createdBy: me,
        members: [{ user: me }, { user: other }],
        lastActivity: new Date(),
      })
    } catch (err) {
      if (err.code !== 11000) throw err
      conv = await Conversation.findOne({ directKey })
    }
  }
  const full = await populateConv(Conversation.findById(conv._id))
  const counts = await unreadCounts(me, [conv._id])
  res.status(201).json({ conversation: serializeConversation(full, me, counts[String(conv._id)] || 0) })
})

export const createGroup = asyncHandler(async (req, res) => {
  const me = String(req.user._id)
  const ids = uniqueIds(req.body.memberIds).filter((i) => i !== me)
  if (!ids.length) throw new ApiError(400, 'Add at least one other member')
  if (ids.length + 1 > MAX_GROUP_MEMBERS) throw new ApiError(400, `Groups can have up to ${MAX_GROUP_MEMBERS} members`)
  await validUsers(ids)

  const conv = await Conversation.create({
    isGroup: true,
    name: req.body.name,
    description: req.body.description || '',
    avatar: req.body.avatar || null,
    createdBy: me,
    members: [{ user: me, role: 'admin' }, ...ids.map((user) => ({ user }))],
    lastActivity: new Date(),
  })

  const full = await populateConv(Conversation.findById(conv._id))
  await createMessage({ conversation: full, senderId: me, type: 'system', text: `${req.user.name} created the group "${conv.name}"` })
  await broadcastConversation(conv._id, 'conversation:new', { only: ids })

  const again = await populateConv(Conversation.findById(conv._id))
  res.status(201).json({ conversation: serializeConversation(again, me, 0) })
})

export const updateGroup = asyncHandler(async (req, res) => {
  const conv = await getMemberConversation(req.params.id, req.user._id)
  if (!conv.isGroup) throw new ApiError(400, 'Only groups can be edited')
  if (!isGroupAdmin(conv, req.user._id)) throw new ApiError(403, 'Only group admins can edit the group')

  const { name, description, avatar } = req.body
  const oldName = conv.name
  if (name !== undefined) conv.name = name
  if (description !== undefined) conv.description = description
  if (avatar !== undefined) conv.avatar = avatar || null
  await conv.save()

  if (name !== undefined && name !== oldName) {
    await createMessage({ conversation: conv, senderId: req.user._id, type: 'system', text: `${req.user.name} renamed the group to "${conv.name}"` })
  }
  await broadcastConversation(conv._id, 'conversation:updated')
  const fresh = await populateConv(Conversation.findById(conv._id))
  res.json({ conversation: serializeConversation(fresh, req.user._id, 0) })
})

export const addMembers = asyncHandler(async (req, res) => {
  const conv = await getMemberConversation(req.params.id, req.user._id)
  if (!conv.isGroup) throw new ApiError(400, 'Only groups have members')
  if (!isGroupAdmin(conv, req.user._id)) throw new ApiError(403, 'Only group admins can add members')

  const existing = new Set(memberIds(conv))
  const ids = uniqueIds(req.body.userIds).filter((i) => !existing.has(i))
  if (!ids.length) throw new ApiError(400, 'Those people are already in the group')
  if (existing.size + ids.length > MAX_GROUP_MEMBERS) throw new ApiError(400, `Groups can have up to ${MAX_GROUP_MEMBERS} members`)
  const users = await validUsers(ids)

  await Conversation.updateOne({ _id: conv._id }, { $push: { members: { $each: ids.map((user) => ({ user })) } } })
  const fresh = await populateConv(Conversation.findById(conv._id))
  await broadcastConversation(conv._id, 'conversation:new', { only: ids })
  await createMessage({ conversation: fresh, senderId: req.user._id, type: 'system', text: `${req.user.name} added ${users.map((u) => u.name).join(', ')}` })
  await broadcastConversation(conv._id, 'conversation:updated', { only: [...existing] })

  const again = await populateConv(Conversation.findById(conv._id))
  res.json({ conversation: serializeConversation(again, req.user._id, 0) })
})

export const removeMember = asyncHandler(async (req, res) => {
  const conv = await getMemberConversation(req.params.id, req.user._id)
  const target = req.params.userId
  if (!conv.isGroup) throw new ApiError(400, 'Only groups have members')
  if (!isGroupAdmin(conv, req.user._id)) throw new ApiError(403, 'Only group admins can remove members')
  if (target === String(req.user._id)) throw new ApiError(400, 'Use "Leave group" to leave')
  if (String(conv.createdBy) === target) throw new ApiError(403, 'The group creator cannot be removed')
  if (!memberIds(conv).includes(target)) throw new ApiError(404, 'That person is not in the group')

  const removed = await User.findById(target).select('name')
  await Conversation.updateOne({ _id: conv._id }, { $pull: { members: { user: target }, pinnedBy: target, archivedBy: target, mutedBy: target } })
  emitToUser(target, 'conversation:removed', { conversationId: String(conv._id) })

  const fresh = await populateConv(Conversation.findById(conv._id))
  await createMessage({ conversation: fresh, senderId: req.user._id, type: 'system', text: `${req.user.name} removed ${removed?.name || 'a member'}` })
  await broadcastConversation(conv._id, 'conversation:updated')

  const again = await populateConv(Conversation.findById(conv._id))
  res.json({ conversation: serializeConversation(again, req.user._id, 0) })
})

export const toggleAdmin = asyncHandler(async (req, res) => {
  const conv = await getMemberConversation(req.params.id, req.user._id)
  const target = req.params.userId
  if (!conv.isGroup) throw new ApiError(400, 'Only groups have admins')
  if (!isGroupAdmin(conv, req.user._id)) throw new ApiError(403, 'Only group admins can change roles')
  if (String(conv.createdBy) === target) throw new ApiError(403, "The group creator's role cannot be changed")

  const member = conv.members.find((m) => String(m.user._id) === target)
  if (!member) throw new ApiError(404, 'That person is not in the group')

  const makeAdmin = member.role !== 'admin'
  await Conversation.updateOne({ _id: conv._id, 'members.user': target }, { $set: { 'members.$.role': makeAdmin ? 'admin' : 'member' } })
  const fresh = await populateConv(Conversation.findById(conv._id))
  await createMessage({
    conversation: fresh,
    senderId: req.user._id,
    type: 'system',
    text: makeAdmin ? `${req.user.name} made ${member.user.name} an admin` : `${req.user.name} removed ${member.user.name} as admin`,
  })
  await broadcastConversation(conv._id, 'conversation:updated')

  const again = await populateConv(Conversation.findById(conv._id))
  res.json({ conversation: serializeConversation(again, req.user._id, 0) })
})

export const leaveGroup = asyncHandler(async (req, res) => {
  const conv = await getMemberConversation(req.params.id, req.user._id)
  if (!conv.isGroup) throw new ApiError(400, 'You can only leave groups')
  const me = String(req.user._id)

  const remaining = memberIds(conv).filter((i) => i !== me)
  if (!remaining.length) {
    await destroyConversation(conv._id)
    return res.json({ message: 'Group deleted' })
  }

  await Conversation.updateOne({ _id: conv._id }, { $pull: { members: { user: me }, pinnedBy: me, archivedBy: me, mutedBy: me } })
  await ensureAdmin(conv._id)
  const fresh = await populateConv(Conversation.findById(conv._id))
  await createMessage({ conversation: fresh, senderId: me, type: 'system', text: `${req.user.name} left the group` })
  await broadcastConversation(conv._id, 'conversation:updated')
  res.json({ message: 'You left the group' })
})

export const deleteGroup = asyncHandler(async (req, res) => {
  const conv = await getMemberConversation(req.params.id, req.user._id)
  if (!conv.isGroup) throw new ApiError(400, 'Only groups can be deleted')
  if (String(conv.createdBy) !== String(req.user._id)) throw new ApiError(403, 'Only the group creator can delete the group')
  const ids = memberIds(conv)
  await destroyConversation(conv._id)
  emitToUsers(ids, 'conversation:removed', { conversationId: String(conv._id) })
  res.json({ message: 'Group deleted' })
})

export const updatePreferences = asyncHandler(async (req, res) => {
  const conv = await getMemberConversation(req.params.id, req.user._id)
  const me = req.user._id
  const ops = {}
  const flag = (field, key, value) => {
    ops[value ? '$addToSet' : '$pull'] = { ...(ops[value ? '$addToSet' : '$pull'] || {}), [field]: me }
  }

  if (typeof req.body.pinned === 'boolean') {
    if (req.body.pinned) {
      const pinned = await Conversation.countDocuments({ pinnedBy: me })
      if (pinned >= MAX_PINS && !conv.pinnedBy.some((x) => String(x) === String(me))) {
        throw new ApiError(400, `You can pin up to ${MAX_PINS} chats`)
      }
    }
    flag('pinnedBy', 'pinned', req.body.pinned)
  }
  if (typeof req.body.archived === 'boolean') flag('archivedBy', 'archived', req.body.archived)
  if (typeof req.body.muted === 'boolean') flag('mutedBy', 'muted', req.body.muted)

  if (Object.keys(ops).length) await Conversation.updateOne({ _id: conv._id }, ops)
  const fresh = await populateConv(Conversation.findById(conv._id))
  const counts = await unreadCounts(me, [conv._id])
  res.json({ conversation: serializeConversation(fresh, me, counts[String(conv._id)] || 0) })
})

export const markRead = asyncHandler(async (req, res) => {
  const conv = await getMemberConversation(req.params.id, req.user._id)
  const me = req.user._id
  const shareReceipt = req.user.privacy?.readReceipts !== false

  const result = await Message.updateMany(
    { conversation: conv._id, sender: { $ne: me }, readBy: { $ne: me } },
    { $addToSet: { readBy: me, deliveredTo: me, ...(shareReceipt ? { seenBy: me } : {}) } }
  )
  if (result.modifiedCount && shareReceipt) {
    emitToUsers(memberIds(conv).filter((i) => i !== String(me)), 'messages:read', {
      conversationId: String(conv._id),
      userId: String(me),
      at: new Date().toISOString(),
    })
  }
  res.json({ ok: true, unread: 0 })
})

export const clearChat = asyncHandler(async (req, res) => {
  const conv = await getMemberConversation(req.params.id, req.user._id)
  await Message.updateMany({ conversation: conv._id }, { $addToSet: { deletedFor: req.user._id, readBy: req.user._id } })
  res.json({ ok: true })
})

// ---- messages inside a conversation ----

export const getMessages = asyncHandler(async (req, res) => {
  const conv = await getMemberConversation(req.params.id, req.user._id)
  const limit = Math.min(Number(req.query.limit) || 30, 60)
  const base = { conversation: conv._id, deletedFor: { $ne: req.user._id } }

  if (req.query.around && mongoose.isValidObjectId(req.query.around)) {
    const target = await Message.findOne({ ...base, _id: req.query.around })
    if (!target) throw new ApiError(404, 'Message not found')
    const [older, newer] = await Promise.all([
      populateMessage(Message.find({ ...base, _id: { $lte: target._id } }).sort({ _id: -1 }).limit(26)),
      populateMessage(Message.find({ ...base, _id: { $gt: target._id } }).sort({ _id: 1 }).limit(25)),
    ])
    const hasMore = older.length > 25
    const items = [...older.slice(0, 25).reverse(), ...newer]
    return res.json({ messages: items.map(serializeMessage), hasMore, detached: true })
  }

  const filter = { ...base }
  if (req.query.before && mongoose.isValidObjectId(req.query.before)) filter._id = { $lt: req.query.before }
  const rows = await populateMessage(Message.find(filter).sort({ _id: -1 }).limit(limit + 1))
  const hasMore = rows.length > limit
  res.json({ messages: rows.slice(0, limit).reverse().map(serializeMessage), hasMore, detached: false })
})
