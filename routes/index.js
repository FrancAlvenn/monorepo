import { Router } from 'express'
import auth from './auth.js'

const router = Router()
router.get('/api/ping', (req, res) => res.json({ message: 'pong' }))
router.use('/api', auth)
export default router
