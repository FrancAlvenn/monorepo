import request from 'supertest'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { createUser } from '../services/firestore.js'

let app

beforeAll(async () => {
  const mod = await import('../app.js')
  app = mod.default
})

test('current returns normalized geo from ipinfo', async () => {
  const u = await createUser({ email: 'geo@example.com', password: 'StrongP@ss1' })
  const token = jwt.sign({}, env.jwtAccessSecret, { subject: String(u.id), expiresIn: env.jwtAccessTtl })
  const mock = {
    ip: '49.150.54.33',
    city: 'Baguio',
    region: 'Cordillera',
    country: 'PH',
    loc: '16.4164,120.5931',
    org: 'AS9299 Philippine Long Distance Telephone Company',
    postal: '2600',
    timezone: 'Asia/Manila',
  }
  const oldFetch = global.fetch
  global.fetch = async () => ({ ok: true, json: async () => mock })
  const res = await request(app).get('/api/ip/current').set('Authorization', `Bearer ${token}`)
  global.fetch = oldFetch
  expect(res.status).toBe(200)
  expect(res.body.ip).toBe(mock.ip)
  expect(res.body.geo.country).toBe(mock.country)
  expect(res.body.geo.regionName).toBe(mock.region)
  expect(res.body.geo.city).toBe(mock.city)
  expect(res.body.geo.timezone).toBe(mock.timezone)
  expect(res.body.geo.isp).toBe(mock.org)
  expect(res.body.geo.lat).toBeCloseTo(16.4164)
  expect(res.body.geo.lon).toBeCloseTo(120.5931)
})

test('lookup uses ip param and returns normalized geo', async () => {
  const u = await createUser({ email: 'geo2@example.com', password: 'StrongP@ss1' })
  const token = jwt.sign({}, env.jwtAccessSecret, { subject: String(u.id), expiresIn: env.jwtAccessTtl })
  const mock = {
    ip: '8.8.8.8',
    city: 'Mountain View',
    region: 'California',
    country: 'US',
    loc: '37.4056,-122.0775',
    org: 'AS15169 Google LLC',
    postal: '94043',
    timezone: 'America/Los_Angeles',
  }
  const oldFetch = global.fetch
  global.fetch = async () => ({ ok: true, json: async () => mock })
  const res = await request(app)
    .get('/api/ip/lookup')
    .set('Authorization', `Bearer ${token}`)
    .query({ ip: '8.8.8.8' })
  global.fetch = oldFetch
  expect(res.status).toBe(200)
  expect(res.body.ip).toBe('8.8.8.8')
  expect(res.body.geo.country).toBe('US')
  expect(res.body.geo.regionName).toBe('California')
  expect(res.body.geo.city).toBe('Mountain View')
})

test('handles API failure', async () => {
  const u = await createUser({ email: 'geo3@example.com', password: 'StrongP@ss1' })
  const token = jwt.sign({}, env.jwtAccessSecret, { subject: String(u.id), expiresIn: env.jwtAccessTtl })
  const oldFetch = global.fetch
  global.fetch = async () => ({ ok: false, json: async () => ({}) })
  const res = await request(app).get('/api/ip/current').set('Authorization', `Bearer ${token}`)
  global.fetch = oldFetch
  expect(res.status).toBe(502)
})
