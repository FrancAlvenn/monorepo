import { Router } from 'express'

const router = Router()

router.get('/api/ping', (req, res) => {
  res.json({ message: 'pong' })
})

export default router
