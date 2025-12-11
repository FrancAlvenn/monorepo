import { firestore } from '../config/firebase.js'
import { env } from '../config/env.js'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

const mem = {
  users: new Map(),
  refreshTokens: new Map(),
  ipSearches: new Map(),
}

function useMem() {
  return env.nodeEnv === 'development' || !firestore
}

// Create default users
export async function createDefaultUsers() {
  if (!useMem()) return
  const users = [
    { email: 'test@gmail.com', password: 'Password123-', displayName: 'User One', failedAttempts: 0, lockoutUntil: null, createdAt: Date.now() },
    { email: 'admin@gmail.com', password: 'Admin123-', displayName: 'Admin User', failedAttempts: 0, lockoutUntil: null, createdAt: Date.now() },
  ]
  for (const user of users) {
    await createUser(user)
  }
}

export async function getUserByEmail(email) {
  if (useMem()) {
    const u = [...mem.users.values()].find((x) => x.email === email)
    return u || null
  }
  const snapshot = await firestore.collection('users').where('email', '==', email).limit(1).get()
  if (snapshot.empty) return null
  const doc = snapshot.docs[0]
  return { id: doc.id, ...doc.data() }
}

export async function createUser({ email, password, displayName }) {
  const salt = await bcrypt.genSalt(10)
  const hashed = await bcrypt.hash(password, salt)
  const data = { email, password: hashed, displayName: displayName || '', failedAttempts: 0, lockoutUntil: null, createdAt: Date.now() }
  if (useMem()) {
    const id = uuidv4()
    mem.users.set(id, { id, ...data })
    return { id, ...data }
  }
  const ref = await firestore.collection('users').add(data)
  return { id: ref.id, ...data }
}

export async function updateUser(id, patch) {
  if (useMem()) {
    const u = mem.users.get(id)
    if (!u) return
    const upd = { ...u, ...patch }
    mem.users.set(id, upd)
    return upd
  }
  await firestore.collection('users').doc(id).set(patch, { merge: true })
}

export async function createRefreshToken({ userId, jti, expiresAt }) {
  const data = { userId, jti, expiresAt, revoked: false, createdAt: Date.now() }
  if (useMem()) {
    const id = uuidv4()
    mem.refreshTokens.set(id, { id, ...data })
    return { id, ...data }
  }
  const ref = await firestore.collection('refreshTokens').add(data)
  return { id: ref.id, ...data }
}

export async function findRefreshToken({ userId, jti }) {
  if (useMem()) {
    const r = [...mem.refreshTokens.values()].find((x) => x.userId === userId && x.jti === jti)
    return r || null
  }
  const snapshot = await firestore
    .collection('refreshTokens')
    .where('userId', '==', userId)
    .where('jti', '==', jti)
    .limit(1)
    .get()
  if (snapshot.empty) return null
  const doc = snapshot.docs[0]
  return { id: doc.id, ...doc.data() }
}

export async function revokeRefreshToken(id) {
  if (useMem()) {
    const r = mem.refreshTokens.get(id)
    if (!r) return
    mem.refreshTokens.set(id, { ...r, revoked: true })
    return
  }
  await firestore.collection('refreshTokens').doc(id).set({ revoked: true }, { merge: true })
}

export async function addIpSearchRecord({ userId, searchedIP, geolocationData, timestamp }) {
  const data = { userId, searchedIP, geolocationData, timestamp: timestamp || Date.now() }
  
  if (useMem()) {
    const existing = [...mem.ipSearches.values()].find(
      (rec) => rec.userId === userId && rec.searchedIP === searchedIP
    )
    if (existing) {
      mem.ipSearches.set(existing.id, { ...existing, timestamp: data.timestamp })
      return existing
    }
    const id = uuidv4()
    mem.ipSearches.set(id, { id, ...data })
    return { id, ...data }
  }

  const existingQuery = await firestore
    .collection('ip_search_history')
    .where('userId', '==', userId)
    .where('searchedIP', '==', searchedIP)
    .limit(1)
    .get()

  if (!existingQuery.empty) {
    const doc = existingQuery.docs[0]
    await doc.ref.update({ timestamp: data.timestamp })
    return { id: doc.id, ...doc.data(), timestamp: data.timestamp }
  }

  const ref = await firestore.collection('ip_search_history').add(data)
  return { id: ref.id, ...data }
}

export async function getIpSearchHistory({ userId, limit = 50 }) {
  if (useMem()) {
    const items = [...mem.ipSearches.values()].filter((x) => x.userId === userId)
    return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit)
  }
  try {
    const snapshot = await firestore
      .collection('ip_search_history')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get()
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch (e) {
    console.error('getIpSearchHistory failed', { userId, error: e?.message })
    throw e
  }
}

export async function deleteIpSearchByIds({ userId, ids }) {
  if (!Array.isArray(ids) || ids.length === 0) return 0
  ids = ids.map(String) // Ensure all IDs are strings

  if (useMem()) {
    let count = 0
    for (const id of ids) {
      const rec = mem.ipSearches.get(id)
      if (rec && String(rec.userId) === String(userId)) {
        mem.ipSearches.delete(id)
        count++
      }
    }
    return count
  }

  let deleted = 0
  try {
    await firestore.runTransaction(async (tx) => {
      const refs = ids.map((id) => firestore.collection('ip_search_history').doc(id))
      const snaps = await Promise.all(refs.map((ref) => tx.get(ref)))

      for (let i = 0; i < snaps.length; i++) {
        const snap = snaps[i]
        if (!snap.exists) continue
        const data = snap.data()
        if (String(data.userId) !== String(userId)) continue
        tx.delete(refs[i])
        deleted++
      }
    })
    return deleted
  } catch (e) {
    console.error('deleteIpSearchByIds failed:', e)
    throw new Error('Failed to delete records')
  }
}
