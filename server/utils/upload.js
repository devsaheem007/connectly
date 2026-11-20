import multer from 'multer'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { cloudinary, cloudinaryEnabled } from '../config/cloudinary.js'
import { ApiError } from './ApiError.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const UPLOAD_DIR = path.join(__dirname, '..', 'uploads')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const BLOCKED_EXT = new Set([
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.sh', '.js', '.mjs', '.jar', '.php', '.html', '.htm', '.svg', '.xml', '.ps1', '.vbs', '.dll',
])
const BLOCKED_MIME = ['text/html', 'image/svg+xml', 'application/x-msdownload', 'application/javascript', 'text/javascript']

const MAX_FILE = 15 * 1024 * 1024
const MAX_IMAGE = 6 * 1024 * 1024

const baseFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase()
  if (BLOCKED_EXT.has(ext) || BLOCKED_MIME.includes(file.mimetype)) {
    return cb(new ApiError(400, `Files of type "${ext || file.mimetype}" are not allowed`))
  }
  cb(null, true)
}

export const uploadFiles = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE, files: 6 },
  fileFilter: baseFilter,
}).array('files', 6)

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!/^image\/(png|jpe?g|webp|gif|avif)$/.test(file.mimetype)) {
      return cb(new ApiError(400, 'Only PNG, JPG, WEBP, GIF or AVIF images are allowed'))
    }
    cb(null, true)
  },
}).single('image')

const kindOf = (mime = '') => {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'file'
}

/** Stores one multer memory file (Cloudinary if configured, otherwise local disk). */
export async function storeFile(file, folder = 'files') {
  const kind = kindOf(file.mimetype)
  const base = { name: file.originalname.slice(0, 140), mimeType: file.mimetype, size: file.size, kind }

  if (cloudinaryEnabled) {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `connectly/${folder}`, resource_type: 'auto', use_filename: false },
        (err, res) => (err ? reject(err) : resolve(res))
      )
      stream.end(file.buffer)
    })
    return { ...base, url: result.secure_url, publicId: result.public_id, resourceType: result.resource_type }
  }

  const ext = path.extname(file.originalname || '').toLowerCase().replace(/[^.a-z0-9]/g, '')
  const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`
  await fs.promises.writeFile(path.join(UPLOAD_DIR, name), file.buffer)
  return { ...base, url: `/uploads/${name}`, publicId: `local:${name}` }
}

/** Best-effort deletion of a stored file. */
export async function removeStored(att) {
  try {
    if (!att?.publicId) return
    if (att.publicId.startsWith('local:')) {
      const name = path.basename(att.publicId.slice(6))
      await fs.promises.unlink(path.join(UPLOAD_DIR, name))
    } else if (cloudinaryEnabled) {
      await cloudinary.uploader.destroy(att.publicId, { resource_type: att.resourceType || 'image' })
    }
  } catch {
    /* ignore */
  }
}

/** Only accept attachment URLs that were produced by our own upload endpoint. */
export function isTrustedUrl(url = '') {
  if (typeof url !== 'string') return false
  if (/^\/uploads\/[\w.-]+$/.test(url)) return true
  return cloudinaryEnabled && url.startsWith('https://res.cloudinary.com/')
}
