import { Router } from 'express'
import authRoutes from './authRoutes.js'
import userRoutes from './userRoutes.js'
import chatRoutes from './chatRoutes.js'
import uploadRoutes from './uploadRoutes.js'
import adminRoutes from './adminRoutes.js'

const router = Router()

router.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }))
router.use('/auth', authRoutes)
router.use('/users', userRoutes)
router.use('/upload', uploadRoutes)
router.use('/admin', adminRoutes)
router.use('/', chatRoutes)

export default router
