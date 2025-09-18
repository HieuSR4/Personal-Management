import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, firebaseReady } = useAuth()

  if (loading) {
    return <div className="card">Dang tai thong tin nguoi dung...</div>
  }

  if (!firebaseReady) {
    return (
      <div className="card auth-required">
        <h2>Chua cau hinh Firebase</h2>
        <p>
          Vui long cap nhat file <code>.env</code> voi thong tin Firebase cua ban theo huong dan trong
          <code>README.md</code>, sau do khoi dong lai dev server.
        </p>
      </div>
    )
  }

  if (!user) {
    const location = useLocation()
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}
