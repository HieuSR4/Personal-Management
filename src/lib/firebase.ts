import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, GoogleAuthProvider } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const requiredKeys: (keyof typeof firebaseConfig)[] = ['apiKey', 'authDomain', 'projectId', 'appId']
const isFirebaseConfigured = requiredKeys.every((k) => !!firebaseConfig[k])

let firebaseApp: ReturnType<typeof initializeApp> | null = null
let auth: ReturnType<typeof getAuth> | null = null
let db: ReturnType<typeof getFirestore> | null = null
let googleProvider: GoogleAuthProvider | null = null

try {
  if (!isFirebaseConfigured) {
    console.warn('Firebase config is missing. App will run in no-auth mode until configured (.env).')
  } else {
    firebaseApp = initializeApp(firebaseConfig)
    auth = getAuth(firebaseApp)
    db = getFirestore(firebaseApp)
    googleProvider = new GoogleAuthProvider()

    if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATOR === 'true') {
      try {
        connectAuthEmulator(auth, 'http://127.0.0.1:9099')
        connectFirestoreEmulator(db, '127.0.0.1', 8080)
      } catch (error) {
        console.warn('Failed to connect to Firebase emulators', error)
      }
    }
  }
} catch (error) {
  console.warn('Failed to initialize Firebase:', error)
}

export { auth, db, firebaseApp, googleProvider, isFirebaseConfigured }
