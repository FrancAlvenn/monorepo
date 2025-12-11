import rateLimit from 'express-rate-limit'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { addIpSearchRecord, getIpSearchHistory, deleteIpSearchByIds } from '../services/firestore.js'

const lookupLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 })
export const ipMiddlewares = [lookupLimiter]

function getUserId(req) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return null
  try {
    const payload = jwt.verify(token, env.jwtAccessSecret)
    return String(payload.sub)
  } catch {
    return null
  }
}

function sanitize(input) {
  return String(input || '').trim()
}

function isValidIpOrDomain(value) {
  const v = sanitize(value)
  const ipv4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/
  const domain = /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)\.(?:[A-Za-z]{2,63})(?:\.[A-Za-z]{2,63})*$/
  return ipv4.test(v) || domain.test(v)
}

async function fetchGeo(target) {
  const base = 'https://ipinfo.io'
  const path = target ? `/${encodeURIComponent(target)}/geo` : '/geo'
  const token = env.ipinfoToken ? `?token=${encodeURIComponent(env.ipinfoToken)}` : ''
  const url = `${base}${path}${token}`
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 5000)
  let res
  try {
    res = await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(t)
  }
  if (!res.ok) throw new Error('Lookup failed')
  const data = await res.json()
  const loc = typeof data.loc === 'string' ? data.loc.split(',') : []
  const lat = loc.length === 2 ? Number(loc[0]) : undefined
  const lon = loc.length === 2 ? Number(loc[1]) : undefined
  const asn = typeof data.org === 'string' && data.org.startsWith('AS') ? data.org.split(' ')[0] : undefined
  return {
    status: 'success',
    message: '',
    country: data.country,
    regionName: data.region,
    city: data.city,
    query: data.ip,
    lat,
    lon,
    isp: data.org,
    org: data.org,
    as: asn,
    timezone: data.timezone,
    zip: data.postal,
  }
}

export async function current(req, res) {
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ message: 'Unauthorized' })
  try {
    const forwarded = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    const ip = forwarded 
      ? String(forwarded).split(',')[0].trim() 
      : req.ip || req.connection.remoteAddress || req.socket.remoteAddress
    const geo = await fetchGeo(ip)
    res.json({ ip: geo.query, geo })
  } catch (e) {
    res.status(502).json({ message: e.message || 'Failed to fetch IP' })
  }
}

export async function lookup(req, res) {
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ message: 'Unauthorized' })
  const q = sanitize(req.method === 'POST' ? req.body?.ip : req.query.ip)
  if (!isValidIpOrDomain(q)) return res.status(400).json({ message: 'Invalid IP or domain' })
  try {
    const geo = await fetchGeo(q)
    if (req.method === 'POST') {
      await addIpSearchRecord({ userId, searchedIP: geo.query, geolocationData: geo, timestamp: Date.now() })
    }
    res.json({ ip: geo.query, geo })
  } catch (e) {
    res.status(502).json({ message: e.message || 'Lookup failed' })
  }
}

export async function history(req, res) {
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ message: 'Unauthorized' })
  try {
    const limit = Number(String(req.query?.limit || '50'))
    if (Number.isNaN(limit) || limit <= 0 || limit > 200) return res.status(400).json({ message: 'Invalid limit' })
    const items = await getIpSearchHistory({ userId, limit })
    res.status(200).json({ items })
  } catch (e) {
    console.error('history load failed', { userId, error: e?.message, stack: e?.stack })
    const msg = e?.message?.includes('index') ? 'Database index missing for history query' : 'Failed to load history'
    res.status(500).json({ message: msg })
  }
}

export async function deleteSelected(req, res) {
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ message: 'Unauthorized' })
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((x) => String(x)).filter(Boolean) : []
    if (ids.length === 0) return res.status(400).json({ message: 'No ids provided' })
    const deleted = await deleteIpSearchByIds({ userId, ids })
    const items = await getIpSearchHistory({ userId, limit: 50 })
    res.status(200).json({ deleted, items })
  } catch (e) {
    console.error('history delete failed', { userId, error: e?.message, stack: e?.stack })
    res.status(500).json({ message: 'Failed to delete' })
  }
}
