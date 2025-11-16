import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { DeviceVerification } from './DeviceVerification'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, firebaseReady, needsDeviceVerification } = useAuth()

  if (loading) {
    return <div className="card">Đang tải thông tin người dùng...</div>
  }

  if (!firebaseReady) {
    return (
      <div className="card auth-required">
        <h2>Chưa cấu hình Firebase</h2>
        <p>
          Vui lòng cập nhật file <code>.env</code> với thông tin Firebase của bạn theo hướng dẫn trong
          <code>README.md</code>, sau đó khởi động lại dev server.
        </p>
      </div>
    )
  }

  if (!user) {
    const location = useLocation()
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (needsDeviceVerification) {
    return <DeviceVerification />
  }

  return <>{children}</>
}
