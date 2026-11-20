import mongoose from 'mongoose'

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: String,
    resourceType: String,
    name: String,
    mimeType: String,
    size: Number,
    kind: { type: String, enum: ['image', 'video', 'audio', 'file'], default: 'file' },
  },
  { _id: false }
)

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['text', 'image', 'video', 'audio', 'file', 'system'], default: 'text' },
    text: { type: String, default: '', maxlength: 5000 },
    attachments: { type: [attachmentSchema], default: [] },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    forwarded: { type: Boolean, default: false },
    reactions: [
      new mongoose.Schema(
        { user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, emoji: String },
        { _id: false }
      ),
    ],
    editedAt: Date,
    isDeleted: { type: Boolean, default: false },
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // readBy drives unread counters (always set); seenBy is the public "read receipt" list
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
)

messageSchema.index({ conversation: 1, _id: -1 })
messageSchema.index({ conversation: 1, readBy: 1 })
messageSchema.index({ createdAt: -1 })

export default mongoose.model('Message', messageSchema)
