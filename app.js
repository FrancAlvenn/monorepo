import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import { env } from './config/env.js'
import cookieParser from 'cookie-parser'
import routes from './routes/index.js'
import { notFound, errorHandler } from './middlewares/errorHandler.js'
import { createDefaultUsers } from './services/firestore.js'
import createIndexes from './utils/createIndexes.js'

const app = express()
app.use(cors({ origin: env.clientOrigin, credentials: true }))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser())

app.get('/health', (req, res) => res.json({ status: 'ok' }))
app.use(routes)
app.use(notFound)
app.use(errorHandler)

app.listen(env.port, async () => {
    await createDefaultUsers()
    console.log(`Default users created`)
})

createIndexes().catch(() => {})

export default app
