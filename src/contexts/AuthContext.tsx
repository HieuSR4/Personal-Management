import type { User } from 'firebase/auth'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import { auth, googleProvider, isFirebaseConfigured } from '../lib/firebase'

type AuthContextValue = {
  user: User | null
  loading: boolean
  signIn: () => Promise<void>
  signOutUser: () => Promise<void>
  firebaseReady: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const firebaseReady = Boolean(isFirebaseConfigured && auth)
  const allowedDomains = (import.meta.env.VITE_ALLOWED_GOOGLE_DOMAINS || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean)
  const allowedEmails = (import.meta.env.VITE_ALLOWED_GOOGLE_EMAILS || '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean)

  const isEmailAllowed = (email?: string | null) => {
    if (!email) return allowedDomains.length === 0 && allowedEmails.length === 0
    const lower = email.toLowerCase()
    if (allowedEmails.length && allowedEmails.includes(lower)) return true
    if (allowedDomains.length) {
      const domain = lower.split('@')[1]
      if (domain && allowedDomains.includes(domain)) return true
      return false
    }
    return allowedEmails.length === 0
  }

  useEffect(() => {
    if (!firebaseReady || !auth) {
      setLoading(false)
      return
    }

    const authInstance = auth
    const unsubscribe = onAuthStateChanged(authInstance, async (firebaseUser) => {
      if (firebaseUser && !isEmailAllowed(firebaseUser.email)) {
        await signOut(authInstance)
        setUser(null)
        setLoading(false)
        console.warn('Blocked sign-in: email not allowed')
        return
      }
      setUser(firebaseUser)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [firebaseReady])

  const signIn = async () => {
    if (!firebaseReady || !auth || !googleProvider) {
      console.warn('Firebase chua duoc cau hinh. Cap nhat .env de dang nhap.')
      return
    }
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      const anyErr = err as { code?: string; message?: string }
      const code = anyErr.code ?? 'unknown'
      const msg = anyErr.message ?? ''
      console.error('Google sign-in failed:', code, msg)
    }
  }

  const signOutUser = async () => {
    if (!firebaseReady || !auth) return
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOutUser, firebaseReady }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return ctx
}
