import { Router } from 'express'
import { body, param } from 'express-validator'
import * as conv from '../controllers/conversationController.js'
import * as msg from '../controllers/messageController.js'
import { protect } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = Router()
router.use(protect)

const id = (name = 'id') => param(name).isMongoId().withMessage('Invalid id')
const groupName = body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Group name must be 2-60 characters')

// ---- conversations ----
router.get('/conversations', conv.listConversations)
router.post('/conversations/direct', [body('userId').isMongoId().withMessage('Invalid user')], validate, conv.createDirect)
router.post(
  '/conversations/group',
  [
    groupName,
    body('description').optional().trim().isLength({ max: 240 }),
    body('memberIds').isArray({ min: 1, max: 255 }).withMessage('Add at least one member'),
    body('memberIds.*').isMongoId().withMessage('Invalid member'),
  ],
  validate,
  conv.createGroup
)

router.get('/conversations/:id', [id()], validate, conv.getConversation)
router.put(
  '/conversations/:id',
  [id(), body('name').optional().trim().isLength({ min: 2, max: 60 }).withMessage('Group name must be 2-60 characters'), body('description').optional().trim().isLength({ max: 240 })],
  validate,
  conv.updateGroup
)
router.delete('/conversations/:id', [id()], validate, conv.deleteGroup)
router.put('/conversations/:id/preferences', [id()], validate, conv.updatePreferences)
router.post('/conversations/:id/read', [id()], validate, conv.markRead)
router.post('/conversations/:id/clear', [id()], validate, conv.clearChat)
router.post('/conversations/:id/leave', [id()], validate, conv.leaveGroup)
router.post(
  '/conversations/:id/members',
  [id(), body('userIds').isArray({ min: 1, max: 50 }).withMessage('Choose at least one person'), body('userIds.*').isMongoId()],
  validate,
  conv.addMembers
)
router.delete('/conversations/:id/members/:userId', [id(), id('userId')], validate, conv.removeMember)
router.put('/conversations/:id/admins/:userId', [id(), id('userId')], validate, conv.toggleAdmin)

// ---- messages ----
router.get('/conversations/:id/messages', [id()], validate, conv.getMessages)
router.post(
  '/conversations/:id/messages',
  [id(), body('text').optional().isString().isLength({ max: 5000 }).withMessage('Message is too long (5000 characters max)'), body('replyTo').optional({ values: 'falsy' }).isMongoId()],
  validate,
  msg.sendMessage
)
router.get('/messages/search', msg.searchMessages)
router.put('/messages/:id', [id(), body('text').isString().trim().isLength({ min: 1, max: 5000 }).withMessage('Message cannot be empty')], validate, msg.editMessage)
router.delete('/messages/:id', [id()], validate, msg.deleteMessage)
router.post('/messages/:id/react', [id(), body('emoji').isString().isLength({ min: 1, max: 8 })], validate, msg.reactToMessage)
router.post(
  '/messages/:id/forward',
  [id(), body('conversationIds').isArray({ min: 1, max: 5 }).withMessage('Choose up to 5 chats'), body('conversationIds.*').isMongoId()],
  validate,
  msg.forwardMessage
)

export default router
