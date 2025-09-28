import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const routes = [
  { path: '/finance', label: 'Tài chính' },
  { path: '/investment', label: 'Danh mục đầu tư' },
  { path: '/market', label: 'Thị trường' },
  { path: '/notes', label: 'Ghi chú' },
]

export function Header() {
  const { user, signIn, signOutUser, loading } = useAuth()
  const appIcon = new URL('../../res/img/icon.svg', import.meta.url).href
  const [navOpen, setNavOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname, user])

  return (
    <header className="app-header">
      <div className="brand">
        <img className="brand-logo-img" src={appIcon} alt="Personal Management" />
        <div>
          <h1>Personal Management</h1>
          <p>Quản lý tài chính, việc cần làm và ghi chú</p>
        </div>
        <button
          type="button"
          className="nav-toggle"
          aria-expanded={navOpen}
          aria-controls="app-navigation"
          onClick={() => setNavOpen((prev) => !prev)}
        >
          <span className="nav-toggle-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="18" height="18" focusable="false">
              <path
                fill="currentColor"
                d="M4 6.75C4 6.34 4.34 6 4.75 6h14.5c.41 0 .75.34.75.75s-.34.75-.75.75H4.75A.75.75 0 0 1 4 6.75Zm0 5.25c0-.41.34-.75.75-.75h14.5c.41 0 .75.34.75.75s-.34.75-.75.75H4.75A.75.75 0 0 1 4 12Zm.75 4.5a.75.75 0 0 0 0 1.5h14.5a.75.75 0 0 0 0-1.5H4.75Z"
              />
            </svg>
          </span>
          <span className="nav-toggle-label">Menu</span>
        </button>
      </div>
      <nav
        id="app-navigation"
        className={`app-nav ${navOpen ? 'open' : ''}`}
        aria-label="Điều hướng ứng dụng"
      >
        {routes.map((route) => (
          <NavLink
            key={route.path}
            to={route.path}
            end
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            {route.label}
          </NavLink>
        ))}
      </nav>
      <div className="auth-area">
        {loading ? (
          <span>Đang tải...</span>
        ) : user ? (
          <div className="user-info">
            {user.photoURL ? (
              <img src={user.photoURL} alt="avatar" />
            ) : (
              <span className="avatar-fallback">{user.displayName?.[0] ?? 'U'}</span>
            )}
            <div className="user-info-details">
              <button type="button" onClick={signOutUser}>
                Đăng xuất
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={signIn}>
            Đăng nhập với Google
          </button>
        )}
      </div>
    </header>
  )
}
