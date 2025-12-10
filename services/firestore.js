import { firestore } from '../config/firebase.js'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

const mem = {
  users: new Map(),
  refreshTokens: new Map(),
  ipSearches: new Map(),
}

function useMem() {
  return !firestore
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

// IP Search History (Firestore)
export async function addIpSearchRecord({ userId, searchedIP, geolocationData, timestamp }) {
  const data = { userId, searchedIP, geolocationData, timestamp: timestamp || Date.now() }
  if (useMem()) {
    const id = uuidv4()
    mem.ipSearches.set(id, { id, ...data })
    return { id, ...data }
  }
  const ref = await firestore.collection('ip_search_history').add(data)
  return { id: ref.id, ...data }
}

export async function getIpSearchHistory({ userId, limit = 50 }) {
  if (useMem()) {
    const items = [...mem.ipSearches.values()].filter((x) => x.userId === userId)
    return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit)
  }
  const snapshot = await firestore
    .collection('ip_search_history')
    .where('userId', '==', userId)
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get()
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function deleteIpSearchByIds({ userId, ids }) {
  if (!Array.isArray(ids) || ids.length === 0) return 0
  if (useMem()) {
    let count = 0
    for (const id of ids) {
      const rec = mem.ipSearches.get(id)
      if (rec && rec.userId === userId) {
        mem.ipSearches.delete(id)
        count++
      }
    }
    return count
  }
  let deleted = 0
  const batch = firestore.batch()
  for (const id of ids) {
    const docRef = firestore.collection('ip_search_history').doc(String(id))
    batch.delete(docRef)
    deleted++
  }
  await batch.commit()
  return deleted
}
