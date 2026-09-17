import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AuthProvider from './context/AuthProvider'
import { useAuth } from './hooks/useAuth'
import Home from './pages/Home'
import Register from './pages/Register'
import Login from './pages/Login'
import Profile from './pages/Profile'
import AdminAccounts from './pages/AdminAccounts'
import Destinations from './pages/Destinations'
import DestinationDetails from './pages/DestinationDetails'
import StaffDestinations from './pages/StaffDestinations'
import Tours from './pages/Tours'
import TourDetails from './pages/TourDetails'
import StaffDestinationCategories from './pages/StaffDestinationCategories'
import Itinerary from './pages/Itinerary'
import FavoriteDestinations from './pages/FavoriteDestinations'
import Stats from './pages/Stats'
import AboutVietnam from './pages/AboutVietnam'
import ToastProvider from './context/ToastProvider'

function AdminRouteGate({ children }) {
  const { user, isAuthenticated } = useAuth()
  const location = useLocation()

  const adminAllowedPaths = [
    '/admin/accounts',
    '/profile',
    '/staff/destinations',
    '/staff/destination-categories',
    '/stats'
  ]

  if (isAuthenticated && user?.role === 'admin' && !adminAllowedPaths.includes(location.pathname)) {
    return <Navigate to="/admin/accounts" replace />
  }

  return children
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <AdminRouteGate>
            <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/destinations" element={<Destinations />} />
            <Route path="/destinations/:id" element={<DestinationDetails />} />
            <Route path="/tours" element={<Tours />} />
            <Route path="/tours/:id" element={<TourDetails />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin/accounts" element={<AdminAccounts />} />
            <Route path="/staff/destinations" element={<StaffDestinations />} />
            <Route path="/staff/destination-categories" element={<StaffDestinationCategories />} />
            <Route path="/itinerary" element={<Itinerary />} />
            <Route path="/favorites" element={<FavoriteDestinations />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/about" element={<AboutVietnam />} />
            </Routes>
          </AdminRouteGate>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
