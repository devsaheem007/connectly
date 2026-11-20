import mongoose from 'mongoose'

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['member', 'admin'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const conversationSchema = new mongoose.Schema(
  {
    isGroup: { type: Boolean, default: false },
    name: { type: String, trim: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 240, default: '' },
    avatar: { type: String, default: null },
    avatarPublicId: { type: String, default: null },
    members: { type: [memberSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    directKey: { type: String, unique: true, sparse: true },
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    lastActivity: { type: Date, default: Date.now },
    pinnedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    mutedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
)

conversationSchema.index({ 'members.user': 1, lastActivity: -1 })

export default mongoose.model('Conversation', conversationSchema)
