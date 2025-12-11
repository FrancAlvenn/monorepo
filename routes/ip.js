import { Router } from 'express'
import { csrfProtection } from '../middlewares/csrf.js'
import { current, lookup, history, deleteSelected, ipMiddlewares } from '../controllers/ipController.js'

const router = Router()
router.get('/current', ...ipMiddlewares, current)
router.get('/lookup', ...ipMiddlewares, lookup)
router.post('/lookup', csrfProtection, ...ipMiddlewares, lookup)
router.get('/history', history)
router.post('/history/delete', csrfProtection, deleteSelected)
export default router
