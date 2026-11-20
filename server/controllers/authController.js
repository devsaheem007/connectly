import crypto from 'crypto'
import User from '../models/User.js'
import { env } from '../config/env.js'
import { emailEnabled, sendEmail } from '../config/mailer.js'
import { ApiError, asyncHandler } from '../utils/ApiError.js'
import { generateOtp, randomToken, safeEqual, sha256 } from '../utils/crypto.js'
import { otpEmail, resetEmail } from '../utils/emailTemplates.js'
import { clearAuthCookie, setAuthCookie } from '../utils/token.js'
import { selfUser } from '../utils/serializers.js'
import { disconnectUser } from '../socket/io.js'

const OTP_TTL_MS = 10 * 60 * 1000
const OTP_RESEND_MS = 45 * 1000
const MAX_OTP_ATTEMPTS = 5
const showDevHints = !env.isProd && !emailEnabled

async function issueOtp(user) {
  const otp = generateOtp()
  user.otpHash = sha256(otp)
  user.otpExpires = new Date(Date.now() + OTP_TTL_MS)
  user.otpAttempts = 0
  user.otpSentAt = new Date()
  await user.save()
  const mail = otpEmail(user.name, otp)
  await sendEmail({ to: user.email, ...mail })
  return showDevHints ? otp : undefined
}

export const getConfig = (req, res) => {
  res.json({
    googleClientId: env.GOOGLE_CLIENT_ID || null,
    demoLogin: env.ALLOW_DEMO_LOGIN,
    emailConfigured: emailEnabled,
  })
}

export const register = asyncHandler(async (req, res) => {
  const { name, username, email, password } = req.body

  const byEmail = await User.findOne({ email }).select('+password')
  const byUsername = await User.findOne({ username })

  if (byUsername && (!byEmail || String(byUsername._id) !== String(byEmail._id))) {
    throw new ApiError(409, 'That username is already taken', 'DUPLICATE')
  }
  if (byEmail && (byEmail.isVerified || byEmail.authProvider !== 'local')) {
    throw new ApiError(409, 'An account with this email already exists. Try logging in.', 'DUPLICATE')
  }

  // Re-registering an unverified account simply refreshes it and re-sends the code.
  const user = byEmail || new User({ email })
  user.name = name
  user.username = username
  user.password = password
  user.authProvider = 'local'
  const devOtp = await issueOtp(user)

  res.status(201).json({ message: 'Verification code sent to your email', email: user.email, ...(devOtp ? { devOtp } : {}) })
})

export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body
  const user = await User.findOne({ email }).select('+otpHash +otpExpires +otpAttempts')
  if (!user || !user.otpHash) throw new ApiError(400, 'Invalid or expired code', 'INVALID_OTP')

  if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
    throw new ApiError(429, 'Too many wrong attempts. Please request a new code.', 'OTP_LOCKED')
  }
  if (!user.otpExpires || user.otpExpires < new Date()) {
    throw new ApiError(400, 'This code has expired. Request a new one.', 'OTP_EXPIRED')
  }
  if (!safeEqual(sha256(otp), user.otpHash)) {
    user.otpAttempts += 1
    await user.save()
    throw new ApiError(400, `Incorrect code. ${MAX_OTP_ATTEMPTS - user.otpAttempts} attempts left.`, 'INVALID_OTP')
  }

  user.isVerified = true
  user.otpHash = undefined
  user.otpExpires = undefined
  user.otpAttempts = 0
  await user.save()

  if (!user.isActive) throw new ApiError(403, 'Your account has been suspended', 'SUSPENDED')
  setAuthCookie(res, user)
  res.json({ user: selfUser(user) })
})

export const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body
  const user = await User.findOne({ email }).select('+otpSentAt')
  // Same response whether or not the account exists (prevents account enumeration)
  if (!user || user.isVerified) return res.json({ message: 'If the account needs verification, a new code was sent.' })

  if (user.otpSentAt && Date.now() - user.otpSentAt.getTime() < OTP_RESEND_MS) {
    const wait = Math.ceil((OTP_RESEND_MS - (Date.now() - user.otpSentAt.getTime())) / 1000)
    throw new ApiError(429, `Please wait ${wait}s before requesting another code`, 'OTP_COOLDOWN')
  }
  const devOtp = await issueOtp(user)
  res.json({ message: 'A new code was sent to your email', ...(devOtp ? { devOtp } : {}) })
})

export const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body
  const id = identifier.trim().toLowerCase()
  const user = await User.findOne({ $or: [{ email: id }, { username: id }] }).select('+password')

  if (!user) throw new ApiError(401, 'Incorrect email/username or password', 'INVALID_CREDENTIALS')
  if (!user.password) {
    throw new ApiError(401, 'This account uses Google sign-in. Continue with Google instead.', 'USE_GOOGLE')
  }
  if (!(await user.comparePassword(password))) {
    throw new ApiError(401, 'Incorrect email/username or password', 'INVALID_CREDENTIALS')
  }
  if (!user.isActive) {
    throw new ApiError(403, user.suspendedReason ? `Account suspended: ${user.suspendedReason}` : 'Your account has been suspended', 'SUSPENDED')
  }
  if (!user.isVerified) {
    const devOtp = await issueOtp(user)
    return res.status(403).json({
      message: 'Please verify your email. We sent you a new code.',
      code: 'NOT_VERIFIED',
      email: user.email,
      ...(devOtp ? { devOtp } : {}),
    })
  }

  setAuthCookie(res, user)
  res.json({ user: selfUser(user) })
})

export const demoLogin = asyncHandler(async (req, res) => {
  if (!env.ALLOW_DEMO_LOGIN) throw new ApiError(404, 'Demo login is disabled')
  const user = await User.findOne({ email: 'demo@connectly.app' })
  if (!user) throw new ApiError(404, 'Demo account not found. Run "npm run seed" in the server folder first.')
  setAuthCookie(res, user)
  res.json({ user: selfUser(user) })
})

export const googleLogin = asyncHandler(async (req, res) => {
  if (!env.GOOGLE_CLIENT_ID) throw new ApiError(501, 'Google sign-in is not configured on the server', 'GOOGLE_DISABLED')
  const { accessToken } = req.body

  const infoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`)
  const info = await infoRes.json().catch(() => ({}))
  if (!infoRes.ok || info.aud !== env.GOOGLE_CLIENT_ID) throw new ApiError(401, 'Google sign-in failed', 'GOOGLE_FAILED')

  const profRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } })
  const profile = await profRes.json().catch(() => ({}))
  if (!profRes.ok || !profile.email || !(profile.email_verified === true || profile.email_verified === 'true')) {
    throw new ApiError(401, 'Your Google email is not verified', 'GOOGLE_FAILED')
  }

  const email = profile.email.toLowerCase()
  let user = await User.findOne({ $or: [{ googleId: profile.sub }, { email }] }).select('+password')

  if (user) {
    if (!user.isActive) throw new ApiError(403, 'Your account has been suspended', 'SUSPENDED')
    if (!user.googleId) user.googleId = profile.sub
    user.isVerified = true
    if (!user.avatar && profile.picture) user.avatar = profile.picture
    await user.save()
  } else {
    const base = (email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.]/g, '') || 'user').slice(0, 18).padEnd(3, '0')
    let username = base
    while (await User.exists({ username })) username = `${base}${crypto.randomInt(100, 9999)}`
    user = await User.create({
      name: (profile.name || base).slice(0, 60),
      username,
      email,
      avatar: profile.picture || null,
      googleId: profile.sub,
      authProvider: 'google',
      isVerified: true,
    })
  }

  setAuthCookie(res, user)
  res.json({ user: selfUser(user) })
})

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body
  const user = await User.findOne({ email })
  const message = 'If an account exists for that email, a reset link has been sent.'
  if (!user || !user.isActive) return res.json({ message })

  const token = randomToken()
  user.resetTokenHash = sha256(token)
  user.resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000)
  await user.save()

  const link = `${env.CLIENT_URL}/reset-password/${token}`
  await sendEmail({ to: user.email, ...resetEmail(user.name, link) })
  res.json({ message, ...(showDevHints ? { devLink: link } : {}) })
})

export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params
  const user = await User.findOne({ resetTokenHash: sha256(token), resetTokenExpires: { $gt: new Date() } }).select(
    '+resetTokenHash +resetTokenExpires +password'
  )
  if (!user) throw new ApiError(400, 'This reset link is invalid or has expired', 'INVALID_TOKEN')

  user.password = req.body.password
  user.resetTokenHash = undefined
  user.resetTokenExpires = undefined
  user.isVerified = true
  user.tokenVersion += 1 // signs out every existing session
  if (user.authProvider === 'google') user.authProvider = 'local'
  await user.save()
  disconnectUser(user._id)

  res.json({ message: 'Password updated. You can now log in.' })
})

export const logout = (req, res) => {
  clearAuthCookie(res)
  res.json({ message: 'Logged out' })
}

export const logoutAll = asyncHandler(async (req, res) => {
  req.user.tokenVersion += 1
  await req.user.save()
  disconnectUser(req.user._id)
  clearAuthCookie(res)
  res.json({ message: 'Logged out of all devices' })
})

export const me = (req, res) => res.json({ user: selfUser(req.user) })
