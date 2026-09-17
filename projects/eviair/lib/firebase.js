import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey:            "AIzaSyBj6I3AipH31UqHsS9q0JmUGuPt7tIEs04",
  authDomain:        "eviair.firebaseapp.com",
  projectId:         "eviair",
  storageBucket:     "eviair.firebasestorage.app",
  messagingSenderId: "45794478925",
  appId:             "1:45794478925:web:d5118c6f5f6d7cad268504"
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export const db      = getFirestore(app)
export const storage = getStorage(app)
