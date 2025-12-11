// utils/createIndexes.js

import { firestore } from "../config/firebase.js"


export async function createIndexes() {
  try {
    // This will fail with a helpful link in dev
    await firestore.collection('ip_search_history')
      .where('userId', '==', 'test')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get()
  } catch (err) {
    if (err.message.includes('index')) {
      console.log('Missing index! Create it here:')
      console.log(err.message.match(/https?:\/\/[^\s]+/g)?.[0] || 'Check Firebase Console → Firestore → Indexes')
    }
  }
}

export default createIndexes

