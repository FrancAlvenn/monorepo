import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import { env } from './config/env.js'
import routes from './routes/index.js'
import { notFound, errorHandler } from './middlewares/errorHandler.js'

const app = express()
app.use(cors({ origin: env.clientOrigin, credentials: true }))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.get('/health', (req, res) => res.json({ status: 'ok' }))
app.use(routes)
app.use(notFound)
app.use(errorHandler)

export default app
