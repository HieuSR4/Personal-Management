import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const routes = [
  { path: '/', label: 'Tổng quan', end: true },
  { path: '/finance', label: 'Tài chính' },
  { path: '/tasks', label: 'Việc cần làm' },
  { path: '/notes', label: 'Ghi chú' },
]

export function Header() {
  const { user, signIn, signOutUser, loading } = useAuth()
  const appIcon = new URL('../../res/img/icon.svg', import.meta.url).href

  return (
    <header className="app-header">
      <div className="brand">
        <img className="brand-logo-img" src={appIcon} alt="Personal Management" />
        <div>
          <h1>Personal Management</h1>
          <p>Quản lý tài chính, việc cần làm và ghi chú</p>
        </div>
      </div>
      <nav className="app-nav">
        {routes.map((route) => (
          <NavLink
            key={route.path}
            to={route.path}
            end={route.end}
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
              <span className="user-name">{user.displayName ?? 'Nguoi dung'}</span>
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
