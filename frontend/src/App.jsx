import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AuthProvider from './context/AuthProvider';
import ToastProvider from './context/ToastProvider';
import ProtectedRoute from './components/ProtectedRoute';
import ManagementLayout from './components/management/ManagementLayout';
import { MANAGEMENT_ROLES } from './config/managementNavigation';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import Profile from './pages/Profile';
import AdminAccounts from './pages/AdminAccounts';
import Destinations from './pages/Destinations';
import DestinationDetails from './pages/DestinationDetails';
import StaffDestinations from './pages/StaffDestinations';
import Tours from './pages/Tours';
import TourDetails from './pages/TourDetails';
import StaffDestinationCategories from './pages/StaffDestinationCategories';
import StaffTourCategories from './pages/StaffTourCategories';
import Itinerary from './pages/Itinerary';
import FavoriteDestinations from './pages/FavoriteDestinations';
import Stats from './pages/Stats';
import AboutVietnam from './pages/AboutVietnam';
import ManagementOverview from './pages/ManagementOverview';
import StaffTours from './pages/StaffTours';
import StaffPendingTours from './pages/StaffPendingTours';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/destinations" element={<Destinations />} />
            <Route path="/destinations/:id" element={<DestinationDetails />} />
            <Route path="/tours" element={<Tours />} />
            <Route path="/tours/:id" element={<TourDetails />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/itinerary" element={<Itinerary />} />
            <Route path="/favorites" element={<FavoriteDestinations />} />
            <Route path="/about" element={<AboutVietnam />} />

            <Route element={<ProtectedRoute allowedRoles={MANAGEMENT_ROLES} />}>
              <Route path="/management" element={<ManagementLayout />}>
                <Route index element={<ManagementOverview />} />
                <Route
                  path="accounts"
                  element={(
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminAccounts />
                    </ProtectedRoute>
                  )}
                />
                <Route path="destinations" element={<StaffDestinations />} />
                <Route path="destination-categories" element={<StaffDestinationCategories />} />
                <Route path="tour-categories" element={<StaffTourCategories />} />
                <Route path="tours" element={<StaffTours />} />
                <Route
                  path="pending-tours"
                  element={(
                    <ProtectedRoute allowedRoles={['staff']}>
                      <StaffPendingTours />
                    </ProtectedRoute>
                  )}
                />
                <Route path="statistics" element={<Stats />} />
              </Route>
            </Route>

            <Route path="/admin/accounts" element={<Navigate to="/management/accounts" replace />} />
            <Route path="/staff/destinations" element={<Navigate to="/management/destinations" replace />} />
            <Route path="/staff/destination-categories" element={<Navigate to="/management/destination-categories" replace />} />
            <Route path="/staff/tour-categories" element={<Navigate to="/management/tour-categories" replace />} />
            <Route path="/staff/tours" element={<Navigate to="/management/tours" replace />} />
            <Route path="/stats" element={<Navigate to="/management/statistics" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
