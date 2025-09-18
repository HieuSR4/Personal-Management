import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { user, loading, signIn, firebaseReady } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: Location } }
  const from = (location.state?.from as any)?.pathname || '/'

  useEffect(() => {
    if (!loading && user) {
      navigate(from, { replace: true })
    }
  }, [user, loading, from, navigate])

  if (!firebaseReady) {
    return (
      <div className="login">
        <div className="login-centered">
          <section className="login-card">
            <h2>Chua cau hinh Firebase</h2>
            <p>Vui long cap nhat file .env, sau do khoi dong lai dev server.</p>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="login">
      <div className="login-centered">
        <section className="login-card">
          <button className="google-btn large" type="button" onClick={signIn} disabled={loading}>
            <span className="g-icon">
              <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden focusable="false">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.5 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.8 16.5 19 14 24 14c3 0 5.8 1.1 7.9 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.1 4 9.2 8.5 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.1 0 9.8-1.9 13.3-5.1l-6.1-5.2C29.2 36 26.7 37 24 37c-5.2 0-9.6-3.5-11.2-8.2l-6.5 5C9.1 40.1 16 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.3 3.6-4 6.4-7.4 7.7l6.1 5.2C36.3 39.9 40 33.8 40 26c0-1.2-.1-2.3-.4-3.5z"/>
              </svg>
            </span>
            <span>{loading ? 'Đang đăng nhập...' : 'Đăng nhập với Google'}</span>
          </button>
        </section>
      </div>
    </div>
  )
}

