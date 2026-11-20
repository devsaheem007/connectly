import crypto from 'crypto'

export const generateOtp = () => String(crypto.randomInt(100000, 1000000))
export const sha256 = (v) => crypto.createHash('sha256').update(String(v)).digest('hex')
export const randomToken = () => crypto.randomBytes(32).toString('hex')

export function safeEqual(a, b) {
  const x = Buffer.from(String(a))
  const y = Buffer.from(String(b))
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}
