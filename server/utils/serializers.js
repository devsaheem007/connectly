const id = (v) => String(v?._id || v)

/** Fields we populate when showing another user. */
export const USER_PUBLIC =
  'name username avatar bio statusMessage location website lastSeen privacy.showLastSeen privacy.showOnlineStatus'

export function publicUser(u) {
  if (!u) return null
  const o = u.toObject ? u.toObject() : u
  if (!o.name) return { _id: o._id }
  return {
    _id: o._id,
    name: o.name,
    username: o.username,
    avatar: o.avatar || null,
    bio: o.bio || '',
    statusMessage: o.statusMessage || '',
    location: o.location || '',
    website: o.website || '',
    lastSeen: o.privacy?.showLastSeen === false ? null : o.lastSeen || null,
    hidesOnline: o.privacy?.showOnlineStatus === false,
  }
}

/** The logged-in user's own profile (includes private fields). */
export function selfUser(u) {
  const o = u.toObject ? u.toObject() : u
  return {
    _id: o._id,
    name: o.name,
    username: o.username,
    email: o.email,
    avatar: o.avatar || null,
    bio: o.bio || '',
    statusMessage: o.statusMessage || '',
    location: o.location || '',
    website: o.website || '',
    role: o.role,
    isVerified: o.isVerified,
    authProvider: o.authProvider,
    hasPassword: Boolean(o.password) || o.authProvider === 'local',
    privacy: {
      showLastSeen: o.privacy?.showLastSeen !== false,
      showOnlineStatus: o.privacy?.showOnlineStatus !== false,
      readReceipts: o.privacy?.readReceipts !== false,
    },
    notifications: {
      sound: o.notifications?.sound !== false,
      desktop: o.notifications?.desktop !== false,
      preview: o.notifications?.preview !== false,
      groups: o.notifications?.groups !== false,
    },
    createdAt: o.createdAt,
  }
}

/** What the admin dashboard sees about a user. */
export function adminUser(u) {
  const o = u.toObject ? u.toObject() : u
  return {
    _id: o._id,
    name: o.name,
    username: o.username,
    email: o.email,
    avatar: o.avatar || null,
    role: o.role,
    isVerified: o.isVerified,
    isActive: o.isActive,
    suspendedReason: o.suspendedReason || '',
    authProvider: o.authProvider,
    lastSeen: o.lastSeen,
    createdAt: o.createdAt,
  }
}

export function serializeMessage(m) {
  const o = m.toObject ? m.toObject() : m
  const deleted = Boolean(o.isDeleted)

  let reply = null
  if (o.replyTo && o.replyTo._id) {
    const r = o.replyTo
    reply = {
      _id: r._id,
      type: r.type,
      isDeleted: Boolean(r.isDeleted),
      text: r.isDeleted ? '' : String(r.text || '').slice(0, 200),
      attachment: !r.isDeleted && r.attachments?.[0] ? { kind: r.attachments[0].kind, name: r.attachments[0].name } : null,
      sender: r.sender?._id ? { _id: r.sender._id, name: r.sender.name, username: r.sender.username } : r.sender ? { _id: r.sender } : null,
    }
  } else if (o.replyTo) {
    reply = { _id: o.replyTo, missing: true }
  }

  return {
    _id: o._id,
    conversation: o.conversation,
    sender: o.sender?._id && o.sender.name ? { _id: o.sender._id, name: o.sender.name, username: o.sender.username, avatar: o.sender.avatar || null } : o.sender && !o.sender.name ? { _id: id(o.sender) } : null,
    type: o.type,
    text: deleted ? '' : o.text,
    attachments: deleted ? [] : (o.attachments || []).map(({ url, name, mimeType, size, kind }) => ({ url, name, mimeType, size, kind })),
    replyTo: reply,
    forwarded: Boolean(o.forwarded),
    reactions: deleted ? [] : (o.reactions || []).map((r) => ({ user: id(r.user), emoji: r.emoji })),
    editedAt: o.editedAt || null,
    isDeleted: deleted,
    deliveredTo: (o.deliveredTo || []).map(id),
    seenBy: (o.seenBy || []).map(id),
    createdAt: o.createdAt,
  }
}

export function serializeConversation(conv, userId, unread = 0) {
  const o = conv.toObject ? conv.toObject() : conv
  const uid = String(userId)
  const has = (arr = []) => arr.some((x) => String(x) === uid)

  let lastMessage = null
  if (o.lastMessage && o.lastMessage._id && !has(o.lastMessage.deletedFor)) lastMessage = serializeMessage(o.lastMessage)

  return {
    _id: o._id,
    isGroup: o.isGroup,
    name: o.name || '',
    description: o.description || '',
    avatar: o.avatar || null,
    createdBy: o.createdBy ? id(o.createdBy) : null,
    members: (o.members || []).map((m) => ({ user: publicUser(m.user), role: m.role, joinedAt: m.joinedAt })),
    lastMessage,
    lastActivity: o.lastActivity,
    unread,
    pinned: has(o.pinnedBy),
    archived: has(o.archivedBy),
    muted: has(o.mutedBy),
    createdAt: o.createdAt,
  }
}
