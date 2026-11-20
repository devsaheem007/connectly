import User from '../models/User.js'
import { ApiError, asyncHandler } from '../utils/ApiError.js'
import { escapeRegex } from '../utils/escapeRegex.js'
import { USER_PUBLIC, publicUser, selfUser } from '../utils/serializers.js'
import { removeStored, storeFile } from '../utils/upload.js'
import { clearAuthCookie, setAuthCookie } from '../utils/token.js'
import { deleteUserData } from '../services/conversationService.js'
import { disconnectUser, isOnline, getIO } from '../socket/io.js'

export const searchUsers = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 40)
  const filter = { _id: { $ne: req.user._id }, isActive: true, isVerified: true }
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i')
    filter.$or = [{ name: rx }, { username: rx }]
  }
  const users = await User.find(filter).select(USER_PUBLIC).sort(q ? { name: 1 } : { createdAt: -1 }).limit(25)
  res.json({ users: users.map(publicUser) })
})

export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, isActive: true }).select(USER_PUBLIC)
  if (!user) throw new ApiError(404, 'User not found')
  res.json({ user: publicUser(user) })
})

export const updateProfile = asyncHandler(async (req, res) => {
  const user = req.user
  const { name, username, bio, statusMessage, location, website } = req.body

  if (username !== undefined && username !== user.username) {
    if (await User.exists({ username, _id: { $ne: user._id } })) throw new ApiError(409, 'That username is already taken', 'DUPLICATE')
    user.username = username
  }
  if (name !== undefined) user.name = name
  if (bio !== undefined) user.bio = bio
  if (statusMessage !== undefined) user.statusMessage = statusMessage
  if (location !== undefined) user.location = location
  if (website !== undefined) user.website = website
  await user.save()

  getIO()?.emit('user:updated', publicUser(user))
  res.json({ user: selfUser(user) })
})

export const updateSettings = asyncHandler(async (req, res) => {
  const user = req.user
  const wasHidden = user.privacy.showOnlineStatus === false

  for (const key of ['showLastSeen', 'showOnlineStatus', 'readReceipts']) {
    if (typeof req.body.privacy?.[key] === 'boolean') user.privacy[key] = req.body.privacy[key]
  }
  for (const key of ['sound', 'desktop', 'preview', 'groups']) {
    if (typeof req.body.notifications?.[key] === 'boolean') user.notifications[key] = req.body.notifications[key]
  }
  await user.save()

  // keep presence in sync with the privacy toggle
  const nowHidden = user.privacy.showOnlineStatus === false
  if (wasHidden !== nowHidden && isOnline(user._id)) {
    getIO()?.emit('presence', { userId: String(user._id), online: !nowHidden, lastSeen: user.lastSeen })
  }
  res.json({ user: selfUser(user) })
})

export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password')
  const { currentPassword, newPassword } = req.body

  if (user.password) {
    if (!currentPassword || !(await user.comparePassword(currentPassword))) {
      throw new ApiError(400, 'Your current password is incorrect', 'INVALID_CREDENTIALS')
    }
  }
  user.password = newPassword
  user.tokenVersion += 1 // sign out other sessions
  await user.save()
  setAuthCookie(res, user) // keep the current session alive
  res.json({ message: 'Password updated. Other devices were signed out.' })
})

export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Choose an image to upload')
  const user = await User.findById(req.user._id).select('+avatarPublicId')
  const stored = await storeFile(req.file, 'avatars')
  if (user.avatarPublicId) await removeStored({ publicId: user.avatarPublicId })
  user.avatar = stored.url
  user.avatarPublicId = stored.publicId
  await user.save()
  getIO()?.emit('user:updated', publicUser(user))
  res.json({ user: selfUser(user) })
})

export const removeAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+avatarPublicId')
  if (user.avatarPublicId) await removeStored({ publicId: user.avatarPublicId })
  user.avatar = null
  user.avatarPublicId = null
  await user.save()
  getIO()?.emit('user:updated', publicUser(user))
  res.json({ user: selfUser(user) })
})

export const deleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password')
  if (user.role === 'admin' && (await User.countDocuments({ role: 'admin' })) <= 1) {
    throw new ApiError(400, 'You are the only admin. Promote someone else before deleting your account.')
  }
  if (user.password && !(await user.comparePassword(req.body.password || ''))) {
    throw new ApiError(400, 'Password is incorrect', 'INVALID_CREDENTIALS')
  }
  disconnectUser(user._id)
  await deleteUserData(user._id)
  clearAuthCookie(res)
  res.json({ message: 'Your account was deleted' })
})
