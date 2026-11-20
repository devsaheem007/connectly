import express from 'express'
import http from 'http'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import compression from 'compression'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { Server } from 'socket.io'
import { allowedOrigins, env } from './config/env.js'
import routes from './routes/index.js'
import { errorHandler, notFound } from './middleware/error.js'
import { sanitizeInput } from './middleware/sanitize.js'
import { initSocket } from './socket/index.js'
import { UPLOAD_DIR } from './utils/upload.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const server = http.createServer(app)

const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true },
  maxHttpBufferSize: 1e6,
})
initSocket(io)

app.set('trust proxy', 1)
app.disable('x-powered-by')

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // CSP matters when this server also serves the React app (SERVE_CLIENT=true)
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://accounts.google.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://accounts.google.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        mediaSrc: ["'self'", 'blob:', 'https:'],
        connectSrc: ["'self'", 'ws:', 'wss:', 'https://accounts.google.com', 'https://oauth2.googleapis.com', 'https://www.googleapis.com'],
        frameSrc: ['https://accounts.google.com'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
  })
)
app.use(
  cors({
    origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)),
    credentials: true,
  })
)
app.use(compression())
if (!env.isProd) app.use(morgan('dev'))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use(sanitizeInput)

// Locally stored uploads (used when Cloudinary is not configured).
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    maxAge: '7d',
    index: false,
    setHeaders(res, filePath) {
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox")
      if (!/\.(png|jpe?g|webp|gif|avif|mp4|webm|mov|mp3|wav|ogg|m4a|pdf)$/i.test(filePath)) {
        res.setHeader('Content-Disposition', 'attachment')
      }
    },
  })
)

app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 2000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests. Slow down a little.', code: 'RATE_LIMITED' },
  }),
  routes
)

// Optional: serve the built React app from this server (single-host deployment).
const clientDist = path.join(__dirname, '..', 'client', 'dist')
if (env.SERVE_CLIENT && fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist, { index: false, maxAge: '1h' }))
  app.get(/^\/(?!api\/|uploads\/|socket\.io\/).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')))
}

app.use(notFound)
app.use(errorHandler)

export { app, server, io }
