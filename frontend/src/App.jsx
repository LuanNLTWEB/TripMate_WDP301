import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AuthProvider from './context/AuthProvider'
import Home from './pages/Home'
import Register from './pages/Register'
import Login from './pages/Login'
import Profile from './pages/Profile'
import Destinations from './pages/Destinations'
import Itinerary from './pages/Itinerary'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/destinations" element={<Destinations />} />
          <Route path="/itinerary" element={<Itinerary />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App