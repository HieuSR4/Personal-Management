import { HashRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import { Header } from './components/Header'
import { RequireAuth } from './components/RequireAuth'
import { DashboardPage } from './pages/DashboardPage'
import { FinancePage } from './pages/FinancePage'
import { NotesPage } from './pages/NotesPage'
import { TasksPage } from './pages/TasksPage'
import LoginPage from './pages/LoginPage'
import { useAuth } from './contexts/AuthContext'

function App() {
  const { user } = useAuth()
  return (
    <HashRouter>
      <div className="app">
        {user ? <Header /> : null}
        <main className="app-main">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <DashboardPage />
                </RequireAuth>
              }
            />
            <Route
              path="/finance"
              element={
                <RequireAuth>
                  <FinancePage />
                </RequireAuth>
              }
            />
            <Route
              path="/tasks"
              element={
                <RequireAuth>
                  <TasksPage />
                </RequireAuth>
              }
            />
            <Route
              path="/notes"
              element={
                <RequireAuth>
                  <NotesPage />
                </RequireAuth>
              }
            />
            <Route
              path="*"
              element={
                <div className="card">
                  <h2>Khong tim thay trang</h2>
                  <p>Duong dan ban truy cap khong ton tai.</p>
                </div>
              }
            />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}

export default App

