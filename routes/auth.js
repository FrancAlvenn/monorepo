import { Router } from 'express'
import { login, refresh, loginMiddlewares } from '../controllers/authController.js'
import cookieParser from 'cookie-parser'
import { csrfProtection } from '../middlewares/csrf.js'

const router = Router()
router.use(cookieParser())
router.get('/csrf', csrfProtection, (req, res) => {
  res.cookie('XSRF-TOKEN', req.csrfToken(), { httpOnly: false })
  res.json({ csrfToken: req.csrfToken() })
})
router.post('/login', csrfProtection, ...loginMiddlewares, login)
router.post('/refresh', csrfProtection, refresh)
export default router
