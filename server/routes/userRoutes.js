import { Router } from 'express'
import { body, param } from 'express-validator'
import * as c from '../controllers/userController.js'
import { protect } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { uploadImage } from '../utils/upload.js'

const router = Router()
router.use(protect)

router.get('/search', c.searchUsers)

router.put(
  '/me',
  [
    body('name').optional().trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters'),
    body('username')
      .optional()
      .trim()
      .toLowerCase()
      .matches(/^[a-z0-9_.]{3,24}$/)
      .withMessage('Username must be 3-24 characters: letters, numbers, dot or underscore'),
    body('bio').optional().trim().isLength({ max: 240 }).withMessage('Bio can be up to 240 characters'),
    body('statusMessage').optional().trim().isLength({ max: 80 }).withMessage('Status can be up to 80 characters'),
    body('location').optional().trim().isLength({ max: 60 }).withMessage('Location is too long'),
    body('website')
      .optional({ values: 'falsy' })
      .trim()
      .isURL({ require_protocol: true, protocols: ['http', 'https'] })
      .withMessage('Website must start with http:// or https://')
      .isLength({ max: 120 }),
  ],
  validate,
  c.updateProfile
)

router.put('/me/settings', c.updateSettings)

router.put(
  '/me/password',
  [
    body('newPassword')
      .isString()
      .isLength({ min: 8, max: 72 })
      .withMessage('New password must be 8-72 characters')
      .matches(/[A-Za-z]/)
      .withMessage('Password needs at least one letter')
      .matches(/\d/)
      .withMessage('Password needs at least one number'),
  ],
  validate,
  c.changePassword
)

router.post('/me/avatar', uploadImage, c.uploadAvatar)
router.delete('/me/avatar', c.removeAvatar)
router.delete('/me', c.deleteAccount)

router.get('/:id', [param('id').isMongoId().withMessage('Invalid user id')], validate, c.getUser)

export default router
