import admin from 'firebase-admin'
import { env } from './env.js'

let app
if (env.firebaseProjectId && env.firebaseClientEmail && env.firebasePrivateKey) {
  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.firebaseProjectId,
      clientEmail: env.firebaseClientEmail,
      privateKey: env.firebasePrivateKey.replace(/\\n/g, '\n'),
    }),
  })
}

export const firestore = app ? admin.firestore() : null
