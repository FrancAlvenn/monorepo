import csurf from 'csurf'
import { env } from '../config/env.js'
export const csrfProtection = csurf({
  cookie: {
    key: '_csrf',
    httpOnly: true,
    sameSite: 'none',
    secure: env.nodeEnv === 'production',
    path: '/',
  },
})
