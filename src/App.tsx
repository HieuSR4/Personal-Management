import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { Header } from './components/Header'
import { RequireAuth } from './components/RequireAuth'
import { FinancePage } from './pages/FinancePage'
import { NotesPage } from './pages/NotesPage'
import LoginPage from './pages/LoginPage'
import { useAuth } from './contexts/AuthContext'
import { InvestmentPage } from './pages/InvestmentPage.tsx'
import { MarketPage } from './pages/MarketPage.tsx'

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
                  <Navigate to="/finance" replace />
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
              path="/investment"
              element={
                <RequireAuth>
                  <InvestmentPage />
                </RequireAuth>
              }
            />
            <Route
              path="/market"
              element={
                <RequireAuth>
                  <MarketPage />
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
                  <h2>Không tìm thấy trang</h2>
                  <p>Đường dẫn bạn truy cập không tồn tại.</p>
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

