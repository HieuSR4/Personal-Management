import type { User } from 'firebase/auth'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { auth, googleProvider, isFirebaseConfigured } from '../lib/firebase'
import { verifyAuthenticatorCode } from '../services/authenticator.ts'
import { isDeviceTrusted, markDeviceTrusted, removeTrustedDevice } from '../utils/deviceTrust.ts'

type AuthContextValue = {
  user: User | null
  loading: boolean
  signIn: () => Promise<void>
  signOutUser: () => Promise<void>
  firebaseReady: boolean
  deviceVerified: boolean
  needsDeviceVerification: boolean
  verifyingDevice: boolean
  deviceError: string | null
  verifyDeviceWithCode: (code: string) => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [deviceVerified, setDeviceVerified] = useState(false)
  const [needsDeviceVerification, setNeedsDeviceVerification] = useState(false)
  const [verifyingDevice, setVerifyingDevice] = useState(false)
  const [deviceError, setDeviceError] = useState<string | null>(null)
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
      if (firebaseUser) {
        const trusted = isDeviceTrusted(firebaseUser.uid)
        setDeviceVerified(trusted)
        setNeedsDeviceVerification(!trusted)
      } else {
        setDeviceVerified(false)
        setNeedsDeviceVerification(false)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [firebaseReady])

  const signIn = useCallback(async () => {
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
  }, [firebaseReady])

  const signOutUser = useCallback(async () => {
    if (!firebaseReady || !auth) return
    await signOut(auth)
  if (user) {
      removeTrustedDevice(user.uid)
    }
    setDeviceVerified(false)
    setNeedsDeviceVerification(false)
    setDeviceError(null)
  }, [firebaseReady, user])

  const verifyDeviceWithCode = useCallback(async (code: string) => {
    if (!user) return false
    setVerifyingDevice(true)
    setDeviceError(null)
    try {
      const success = await verifyAuthenticatorCode({ code, userId: user.uid })
      if (success) {
        markDeviceTrusted(user.uid)
        setDeviceVerified(true)
        setNeedsDeviceVerification(false)
        setDeviceError(null)
      } else {
        setDeviceError('Mã xác thực không hợp lệ. Vui lòng thử lại.')
      }
      return success
    } catch (error) {
      console.error('Device verification failed', error)
      setDeviceError('Không thể xác thực thiết bị. Hãy thử lại sau.')
      return false
    } finally {
      setVerifyingDevice(false)
    }
  }, [user])

  const contextValue = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signOutUser,
      firebaseReady,
      deviceVerified,
      needsDeviceVerification,
      verifyingDevice,
      deviceError,
      verifyDeviceWithCode,
    }),
    [
      user,
      loading,
      signIn,
      signOutUser,
      firebaseReady,
      deviceVerified,
      needsDeviceVerification,
      verifyingDevice,
      deviceError,
      verifyDeviceWithCode,
    ],
  )

  return (
    <AuthContext.Provider value={contextValue}>
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
