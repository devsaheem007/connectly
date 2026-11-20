import dotenv from 'dotenv'

dotenv.config()

const required = ['MONGO_URI', 'JWT_SECRET']
const missing = required.filter((k) => !process.env[k])
if (missing.length) {
  console.error(
    `\n❌ Missing required environment variables: ${missing.join(', ')}\n` +
      `   Copy server/.env.example to server/.env and fill it in.\n`
  )
  process.exit(1)
}

const isProd = process.env.NODE_ENV === 'production'
const bool = (v, d = false) => (v === undefined || v === '' ? d : String(v).toLowerCase() === 'true')

if (process.env.JWT_SECRET.length < 24) {
  console.warn('⚠️  JWT_SECRET is short. Use a long random string (32+ characters).')
}

const clientUrls = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim().replace(/\/$/, ''))
  .filter(Boolean)

const sameSite = (process.env.COOKIE_SAMESITE || (isProd ? 'lax' : 'lax')).toLowerCase()

export const env = {
  isProd,
  PORT: Number(process.env.PORT) || 5000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_DAYS: Number(process.env.JWT_EXPIRES_DAYS) || 7,
  CLIENT_URL: clientUrls[0],
  COOKIE_SAMESITE: sameSite,
  COOKIE_SECURE: bool(process.env.COOKIE_SECURE, isProd || sameSite === 'none'),
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'Connectly <no-reply@connectly.app>',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  ALLOW_DEMO_LOGIN: bool(process.env.ALLOW_DEMO_LOGIN, !isProd),
  SERVE_CLIENT: bool(process.env.SERVE_CLIENT, false),
}

export const allowedOrigins = clientUrls
