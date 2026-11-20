import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import { ApiError, asyncHandler } from '../utils/ApiError.js'
import { storeFile, uploadFiles, uploadImage } from '../utils/upload.js'

const router = Router()
router.use(protect)

// Chat attachments (up to 6 files, 15 MB each)
router.post(
  '/files',
  uploadFiles,
  asyncHandler(async (req, res) => {
    if (!req.files?.length) throw new ApiError(400, 'No files received')
    const attachments = await Promise.all(req.files.map((f) => storeFile(f, 'chat')))
    res.status(201).json({ attachments })
  })
)

// Single image (group avatars)
router.post(
  '/image',
  uploadImage,
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, 'No image received')
    const stored = await storeFile(req.file, 'avatars')
    res.status(201).json({ url: stored.url, publicId: stored.publicId })
  })
)

export default router
