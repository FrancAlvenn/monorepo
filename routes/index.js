import { Router } from 'express'
import auth from './auth.js'
import ip from './ip.js'

const router = Router()
router.get('/api/ping', (req, res) => res.json({ message: 'pong' }))
router.use('/api', auth)
router.use('/api/ip', ip)
export default router
