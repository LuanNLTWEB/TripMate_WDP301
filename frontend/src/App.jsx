import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AuthProvider from './context/AuthProvider'
import { useAuth } from './hooks/useAuth'
import Home from './pages/Home'
import Register from './pages/Register'
import Login from './pages/Login'
import Profile from './pages/Profile'
import AdminAccounts from './pages/AdminAccounts'

function AdminRouteGate({ children }) {
  const { user, isAuthenticated } = useAuth()
  const location = useLocation()

  const adminAllowedPaths = ['/admin/accounts', '/profile']

  if (isAuthenticated && user?.role === 'admin' && !adminAllowedPaths.includes(location.pathname)) {
    return <Navigate to="/admin/accounts" replace />
  }

  return children
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AdminRouteGate>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin/accounts" element={<AdminAccounts />} />
          </Routes>
        </AdminRouteGate>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
