import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export const COOKIE_NAME = 'connectly_token'

export const signToken = (user) =>
  jwt.sign({ id: String(user._id), v: user.tokenVersion || 0 }, env.JWT_SECRET, {
    expiresIn: `${env.JWT_EXPIRES_DAYS}d`,
  })

export const verifyToken = (token) => jwt.verify(token, env.JWT_SECRET)

const baseCookie = () => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAMESITE,
  path: '/',
})

export const setAuthCookie = (res, user) =>
  res.cookie(COOKIE_NAME, signToken(user), { ...baseCookie(), maxAge: env.JWT_EXPIRES_DAYS * 86400000 })

export const clearAuthCookie = (res) => res.clearCookie(COOKIE_NAME, baseCookie())
