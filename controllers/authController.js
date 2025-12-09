import { getUserByEmail, createRefreshToken, findRefreshToken, revokeRefreshToken, updateUser } from '../services/firestore.js'
import { env } from '../config/env.js'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import rateLimit from 'express-rate-limit'
import { validateEmail, validatePassword } from '../middlewares/validators.js'
import bcrypt from 'bcryptjs'

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 })

function isLocked(user) {
  return user.lockoutUntil && user.lockoutUntil > new Date()
}

function lockoutDate() {
  return new Date(Date.now() + env.loginLockoutMinutes * 60 * 1000)
}

export const loginMiddlewares = [loginLimiter]

export async function login(req, res) {
  const { email, password } = req.body || {}
  if (!validateEmail(email)) return res.status(400).json({ message: 'Invalid email' })
  if (!validatePassword(password)) return res.status(400).json({ message: 'Weak password' })
  const user = await getUserByEmail(email)
  if (!user) {
    console.warn('login failed', { email, ip: req.ip })
    return res.status(401).json({ message: 'Invalid credentials' })
  }
  if (isLocked(user)) return res.status(423).json({ message: 'Account locked' })
  const ok = await bcrypt.compare(password, user.password)
  if (!ok) {
    const attempts = (user.failedAttempts || 0) + 1
    const maxAttempts = Number(process.env.LOGIN_MAX_ATTEMPTS || env.loginMaxAttempts)
    const patch = { failedAttempts: attempts }
    if (attempts >= maxAttempts) {
      patch.lockoutUntil = lockoutDate()
      patch.failedAttempts = 0
    }
    await updateUser(user.id, patch)
    console.warn('login failed', { userId: user.id, ip: req.ip })
    return res.status(401).json({ message: 'Invalid credentials' })
  }
  await updateUser(user.id, { failedAttempts: 0, lockoutUntil: null })
  const jti = uuidv4()
  const accessToken = jwt.sign({}, env.jwtAccessSecret, { subject: String(user.id), expiresIn: env.jwtAccessTtl, jwtid: jti })
  const refreshJti = uuidv4()
  const refreshToken = jwt.sign({}, env.jwtRefreshSecret, { subject: String(user.id), expiresIn: env.jwtRefreshTtl, jwtid: refreshJti })
  const expires = jwt.decode(accessToken).exp * 1000
  const rtExp = jwt.decode(refreshToken).exp * 1000
  await createRefreshToken({ userId: user.id, jti: refreshJti, expiresAt: new Date(rtExp) })
  res.json({ accessToken, refreshToken, expiresAt: expires, user: { id: user.id, email: user.email } })
}

export async function refresh(req, res) {
  const { refreshToken } = req.body || {}
  const headerToken = req.headers['x-refresh-token']
  const tokenValue = refreshToken || headerToken
  if (!tokenValue) return res.status(400).json({ message: 'Missing refresh token' })
  try {
    const payload = jwt.verify(tokenValue, env.jwtRefreshSecret)
    const record = await findRefreshToken({ userId: payload.sub, jti: payload.jti })
    if (!record || record.revoked || record.expiresAt < new Date()) return res.status(401).json({ message: 'Invalid refresh token' })
    await revokeRefreshToken(record.id)
    const newJti = uuidv4()
    const accessToken = jwt.sign({}, env.jwtAccessSecret, { subject: String(payload.sub), expiresIn: env.jwtAccessTtl, jwtid: newJti })
    const newRefreshJti = uuidv4()
    const newRefreshToken = jwt.sign({}, env.jwtRefreshSecret, { subject: String(payload.sub), expiresIn: env.jwtRefreshTtl, jwtid: newRefreshJti })
    const expires = jwt.decode(accessToken).exp * 1000
    const rtExp = jwt.decode(newRefreshToken).exp * 1000
    await createRefreshToken({ userId: payload.sub, jti: newRefreshJti, expiresAt: new Date(rtExp) })
    res.json({ accessToken, refreshToken: newRefreshToken, expiresAt: expires, user: { id: payload.sub } })
  } catch {
    res.status(401).json({ message: 'Invalid refresh token' })
  }
}
