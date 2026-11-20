import mongoose from 'mongoose'
import Conversation from '../models/Conversation.js'
import Message from '../models/Message.js'
import { ApiError, asyncHandler } from '../utils/ApiError.js'
import { escapeRegex } from '../utils/escapeRegex.js'
import { serializeMessage } from '../utils/serializers.js'
import { getMemberConversation } from '../services/conversationService.js'
import { createMessage, emitMessageUpdate, populateMessage } from '../services/messageService.js'
import { isTrustedUrl, removeStored } from '../utils/upload.js'

const typeFromAttachments = (atts) => {
  if (!atts.length) return 'text'
  const kinds = new Set(atts.map((a) => a.kind))
  return kinds.size === 1 ? [...kinds][0] : 'file'
}

function cleanAttachments(list = []) {
  if (!Array.isArray(list)) return []
  return list.slice(0, 6).map((a) => {
    if (!isTrustedUrl(a?.url)) throw new ApiError(400, 'Invalid attachment')
    return {
      url: a.url,
      publicId: typeof a.publicId === 'string' ? a.publicId : undefined,
      resourceType: typeof a.resourceType === 'string' ? a.resourceType : undefined,
      name: String(a.name || 'file').slice(0, 140),
      mimeType: String(a.mimeType || '').slice(0, 100),
      size: Number(a.size) || 0,
      kind: ['image', 'video', 'audio', 'file'].includes(a.kind) ? a.kind : 'file',
    }
  })
}

async function loadMessageForMember(messageId, userId) {
  if (!mongoose.isValidObjectId(messageId)) throw new ApiError(400, 'Invalid message id')
  const msg = await Message.findById(messageId)
  if (!msg || msg.type === 'system') throw new ApiError(404, 'Message not found')
  const conv = await Conversation.findOne({ _id: msg.conversation, 'members.user': userId })
  if (!conv) throw new ApiError(404, 'Message not found')
  return { msg, conv }
}

export const sendMessage = asyncHandler(async (req, res) => {
  const conversation = await getMemberConversation(req.params.id, req.user._id)
  const text = String(req.body.text || '').trim()
  const attachments = cleanAttachments(req.body.attachments)
  if (!text && !attachments.length) throw new ApiError(400, 'Write a message or attach a file')

  let replyTo = null
  if (req.body.replyTo) {
    const target = await Message.findOne({ _id: req.body.replyTo, conversation: conversation._id })
    if (!target) throw new ApiError(400, 'The message you are replying to no longer exists')
    replyTo = target._id
  }

  const message = await createMessage({
    conversation,
    senderId: req.user._id,
    text,
    type: typeFromAttachments(attachments),
    attachments,
    replyTo,
  })
  res.status(201).json({ message })
})

export const editMessage = asyncHandler(async (req, res) => {
  const { msg } = await loadMessageForMember(req.params.id, req.user._id)
  if (String(msg.sender) !== String(req.user._id)) throw new ApiError(403, 'You can only edit your own messages')
  if (msg.isDeleted) throw new ApiError(400, 'Deleted messages cannot be edited')
  const text = String(req.body.text || '').trim()
  if (!text) throw new ApiError(400, 'Message cannot be empty')

  msg.text = text
  msg.editedAt = new Date()
  await msg.save()
  const payload = await emitMessageUpdate(msg.conversation, msg)
  res.json({ message: payload })
})

export const deleteMessage = asyncHandler(async (req, res) => {
  const { msg } = await loadMessageForMember(req.params.id, req.user._id)
  const scope = req.query.scope === 'everyone' ? 'everyone' : 'me'

  if (scope === 'me') {
    await Message.updateOne({ _id: msg._id }, { $addToSet: { deletedFor: req.user._id } })
    return res.json({ ok: true, scope })
  }

  if (String(msg.sender) !== String(req.user._id)) throw new ApiError(403, 'You can only delete your own messages for everyone')
  const atts = msg.attachments.map((a) => a.toObject())
  msg.isDeleted = true
  msg.text = ''
  msg.attachments = []
  msg.reactions = []
  await msg.save()
  Promise.all(atts.map(removeStored))
  const payload = await emitMessageUpdate(msg.conversation, msg)
  res.json({ ok: true, scope, message: payload })
})

export const reactToMessage = asyncHandler(async (req, res) => {
  const { msg } = await loadMessageForMember(req.params.id, req.user._id)
  if (msg.isDeleted) throw new ApiError(400, 'You cannot react to a deleted message')
  const emoji = String(req.body.emoji || '').slice(0, 8)
  if (!emoji) throw new ApiError(400, 'Choose an emoji')

  const mine = msg.reactions.find((r) => String(r.user) === String(req.user._id))
  msg.reactions = msg.reactions.filter((r) => String(r.user) !== String(req.user._id))
  if (!mine || mine.emoji !== emoji) msg.reactions.push({ user: req.user._id, emoji })
  await msg.save()

  const payload = await emitMessageUpdate(msg.conversation, msg)
  res.json({ message: payload })
})

export const forwardMessage = asyncHandler(async (req, res) => {
  const { msg } = await loadMessageForMember(req.params.id, req.user._id)
  if (msg.isDeleted) throw new ApiError(400, 'Deleted messages cannot be forwarded')
  const targets = [...new Set((req.body.conversationIds || []).map(String))].slice(0, 5)
  if (!targets.length) throw new ApiError(400, 'Choose at least one chat')

  const sent = []
  for (const id of targets) {
    const conversation = await getMemberConversation(id, req.user._id)
    sent.push(
      await createMessage({
        conversation,
        senderId: req.user._id,
        text: msg.text,
        type: msg.type,
        attachments: msg.attachments.map((a) => ({ ...a.toObject() })),
        forwarded: true,
      })
    )
  }
  res.status(201).json({ messages: sent })
})

export const searchMessages = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 80)
  if (q.length < 2) return res.json({ results: [] })

  let convIds
  if (req.query.conversationId) {
    const conv = await getMemberConversation(req.query.conversationId, req.user._id)
    convIds = [conv._id]
  } else {
    const convs = await Conversation.find({ 'members.user': req.user._id }).select('_id')
    convIds = convs.map((c) => c._id)
  }

  const rows = await populateMessage(
    Message.find({
      conversation: { $in: convIds },
      deletedFor: { $ne: req.user._id },
      isDeleted: false,
      type: { $ne: 'system' },
      text: new RegExp(escapeRegex(q), 'i'),
    })
      .sort({ _id: -1 })
      .limit(30)
  )
  res.json({ results: rows.map(serializeMessage) })
})
