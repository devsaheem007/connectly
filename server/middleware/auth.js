import User from '../models/User.js'
import { ApiError, asyncHandler } from '../utils/ApiError.js'
import { COOKIE_NAME, verifyToken } from '../utils/token.js'

/** Loads and validates the user behind a JWT (shared by HTTP and Socket.IO). */
export async function userFromToken(token) {
  if (!token) throw new ApiError(401, 'Please log in to continue', 'UNAUTHENTICATED')
  const payload = verifyToken(token)
  const user = await User.findById(payload.id).select('+password')
  if (!user) throw new ApiError(401, 'Account no longer exists', 'UNAUTHENTICATED')
  if ((user.tokenVersion || 0) !== payload.v) throw new ApiError(401, 'Session expired. Please log in again.', 'UNAUTHENTICATED')
  if (!user.isActive) throw new ApiError(403, user.suspendedReason ? `Account suspended: ${user.suspendedReason}` : 'Your account has been suspended', 'SUSPENDED')
  if (!user.isVerified) throw new ApiError(403, 'Please verify your email first', 'NOT_VERIFIED')
  return user
}

export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization
  const token = req.cookies?.[COOKIE_NAME] || (header?.startsWith('Bearer ') ? header.slice(7) : null)
  req.user = await userFromToken(token)
  next()
})

export const restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) return next(new ApiError(403, 'You do not have permission to do that', 'FORBIDDEN'))
    next()
  }
