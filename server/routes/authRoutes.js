import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { body, param } from 'express-validator'
import * as c from '../controllers/authController.js'
import { protect } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in a few minutes.', code: 'RATE_LIMITED' },
})

const email = body('email').trim().toLowerCase().isEmail().withMessage('Enter a valid email address').isLength({ max: 120 })
const strongPassword = (field = 'password') =>
  body(field)
    .isString()
    .isLength({ min: 8, max: 72 })
    .withMessage('Password must be 8-72 characters')
    .matches(/[A-Za-z]/)
    .withMessage('Password needs at least one letter')
    .matches(/\d/)
    .withMessage('Password needs at least one number')

router.get('/config', c.getConfig)

router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters'),
    body('username')
      .trim()
      .toLowerCase()
      .matches(/^[a-z0-9_.]{3,24}$/)
      .withMessage('Username must be 3-24 characters: letters, numbers, dot or underscore'),
    email,
    strongPassword(),
  ],
  validate,
  c.register
)

router.post('/verify-otp', authLimiter, [email, body('otp').trim().matches(/^\d{6}$/).withMessage('Enter the 6-digit code')], validate, c.verifyOtp)
router.post('/resend-otp', authLimiter, [email], validate, c.resendOtp)

router.post(
  '/login',
  authLimiter,
  [body('identifier').isString().trim().notEmpty().withMessage('Enter your email or username'), body('password').isString().notEmpty().withMessage('Enter your password')],
  validate,
  c.login
)

router.post('/demo', authLimiter, c.demoLogin)
router.post('/google', authLimiter, [body('accessToken').isString().notEmpty().withMessage('Missing Google token')], validate, c.googleLogin)

router.post('/forgot-password', authLimiter, [email], validate, c.forgotPassword)
router.post(
  '/reset-password/:token',
  authLimiter,
  [param('token').isHexadecimal().isLength({ min: 64, max: 64 }).withMessage('Invalid reset link'), strongPassword()],
  validate,
  c.resetPassword
)

router.post('/logout', c.logout)
router.post('/logout-all', protect, c.logoutAll)
router.get('/me', protect, c.me)

export default router
