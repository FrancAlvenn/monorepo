import { Router } from 'express'
import { login, refresh, loginMiddlewares, signup, me, logout } from '../controllers/authController.js'
import cookieParser from 'cookie-parser'
import { csrfProtection } from '../middlewares/csrf.js'
import { env } from '../config/env.js'

const router = Router()
router.use(cookieParser())
router.get('/csrf', csrfProtection, (req, res) => {
  res.cookie('XSRF-TOKEN', req.csrfToken(), {
    httpOnly: false,
    sameSite: 'none',
    secure: env.nodeEnv === 'production',
    path: '/',
  })
  res.json({ csrfToken: req.csrfToken() })
})
router.post('/login', csrfProtection, ...loginMiddlewares, login)
router.post('/refresh', csrfProtection, refresh)
router.post('/signup', csrfProtection, signup)
router.get('/me', me)
router.post('/logout', csrfProtection, logout)
export default router
