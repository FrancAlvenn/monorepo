import request from 'supertest'
import { createUser, getUserByEmail, updateUser } from '../services/firestore.js'
let app

let mongo

beforeAll(async () => {
  process.env.LOGIN_MAX_ATTEMPTS = '2'
  const mod = await import('../app.js')
  app = mod.default
  await createUser({ email: 'test@example.com', password: 'StrongP@ss1' })
})

afterAll(async () => {})

async function getCsrf(agent) {
  const res = await agent.get('/api/csrf')
  const token = JSON.parse(res.text).csrfToken
  const cookies = (res.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ')
  return { token, cookies }
}

test('login success returns tokens', async () => {
  const agent = request.agent(app)
  const { token, cookies } = await getCsrf(agent)
  const res = await agent
    .post('/api/login')
    .set('x-xsrf-token', token)
    .set('Cookie', cookies)
    .send({ email: 'test@example.com', password: 'StrongP@ss1' })
  expect(res.status).toBe(200)
  expect(res.body.accessToken).toBeTruthy()
  expect(res.body.refreshToken).toBeTruthy()
  expect(res.body.expiresAt).toBeTruthy()
  expect(res.body.user.id).toBeTruthy()
})

test('invalid email', async () => {
  const agent = request.agent(app)
  const { token, cookies } = await getCsrf(agent)
  const res = await agent
    .post('/api/login')
    .set('x-xsrf-token', token)
    .set('Cookie', cookies)
    .send({ email: 'bad', password: 'StrongP@ss1' })
  expect(res.status).toBe(400)
})

test('weak password', async () => {
  const agent = request.agent(app)
  const { token, cookies } = await getCsrf(agent)
  const res = await agent
    .post('/api/login')
    .set('x-xsrf-token', token)
    .set('Cookie', cookies)
    .send({ email: 'test@example.com', password: 'weak' })
  expect(res.status).toBe(400)
})

test('lockout after failures', async () => {
  const agent = request.agent(app)
  const { token, cookies } = await getCsrf(agent)
  const fail1 = await agent
    .post('/api/login')
    .set('x-xsrf-token', token)
    .set('Cookie', cookies)
    .send({ email: 'test@example.com', password: 'WrongP@ss1' })
  expect(fail1.status).toBe(401)
  const { token: t2, cookies: c2 } = await getCsrf(agent)
  const fail2 = await agent
    .post('/api/login')
    .set('x-xsrf-token', t2)
    .set('Cookie', c2)
    .send({ email: 'test@example.com', password: 'WrongP@ss1' })
  expect(fail2.status).toBe(401)
  const { token: t3, cookies: c3 } = await getCsrf(agent)
  const locked = await agent
    .post('/api/login')
    .set('x-xsrf-token', t3)
    .set('Cookie', c3)
    .send({ email: 'test@example.com', password: 'WrongP@ss1' })
  expect(locked.status).toBe(423)
})

test('refresh returns new tokens', async () => {
  const agent = request.agent(app)
  const u = await getUserByEmail('test@example.com')
  await updateUser(u.id, { failedAttempts: 0, lockoutUntil: null })
  const { token, cookies } = await getCsrf(agent)
  const loginRes = await agent
    .post('/api/login')
    .set('x-xsrf-token', token)
    .set('Cookie', cookies)
    .send({ email: 'test@example.com', password: 'StrongP@ss1' })
  const { refreshToken } = loginRes.body
  const { token: t2, cookies: c2 } = await getCsrf(agent)
  const res = await agent
    .post('/api/refresh')
    .set('x-xsrf-token', t2)
    .set('x-csrf-token', t2)
    .set('Cookie', c2)
    .set('Content-Type', 'application/json')
    .send({ refreshToken })
  expect(res.status).toBe(200)
  expect(res.body.accessToken).toBeTruthy()
  expect(res.body.refreshToken).toBeTruthy()
})
