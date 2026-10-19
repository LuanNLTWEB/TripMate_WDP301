import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
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
import AdminRoles from './pages/AdminRoles';
import AdminActivityLogs from './pages/AdminActivityLogs';
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
import ReviewTourSubmission from './pages/ReviewTourSubmission';
import StaffPendingTours from './pages/StaffPendingTours';
import ManagementReviews from './pages/ManagementReviews';
import ProviderTourDetails from './pages/ProviderTourDetails';
import ProviderTours from './pages/ProviderTours';
import BookingPage from './pages/BookingPage';
import ProviderBookingRequests from './pages/ProviderBookingRequests';
import BookingHistory from './pages/BookingHistory';

function ProviderTourDetailsRedirect() {
  const { id } = useParams();
  return <Navigate to={`/management/my-tours/${id}/details`} replace />;
}

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
            <Route
              path="/tours/:tourId/booking"
              element={
                <ProtectedRoute allowedRoles={['customer']}>
                  <BookingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-bookings"
              element={
                <ProtectedRoute allowedRoles={['customer']}>
                  <BookingHistory />
                </ProtectedRoute>
              }
            />
            <Route path="/bookings" element={<Navigate to="/my-bookings" replace />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/itinerary" element={<Itinerary />} />
            <Route path="/favorites" element={<FavoriteDestinations />} />
            <Route path="/about" element={<AboutVietnam />} />
            <Route path="/provider/create-tour" element={<Navigate to="/management/my-tours?action=create" replace />} />
            <Route path="/provider/tours/:id/details" element={<ProviderTourDetailsRedirect />} />

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
                <Route
                  path="roles"
                  element={(
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminRoles />
                    </ProtectedRoute>
                  )}
                />
                <Route
                  path="activity-logs"
                  element={(
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminActivityLogs />
                    </ProtectedRoute>
                  )}
                />
                <Route
                  path="reviews"
                  element={(
                    <ProtectedRoute allowedRoles={['admin', 'staff']}>
                      <ManagementReviews />
                    </ProtectedRoute>
                  )}
                />
                <Route element={<ProtectedRoute allowedRoles={['staff']} />}>
                  <Route path="destinations" element={<StaffDestinations />} />
                  <Route path="destination-categories" element={<StaffDestinationCategories />} />
                  <Route path="tour-categories" element={<StaffTourCategories />} />
                  <Route path="tours" element={<StaffTours />} />
                  <Route path="tours/:id" element={<ReviewTourSubmission />} />
                  <Route path="pending-tours" element={<StaffPendingTours />} />
                  <Route path="statistics" element={<Stats />} />
                </Route>
                <Route
                  path="my-tours"
                  element={(
                    <ProtectedRoute allowedRoles={['tourProvider']}>
                      <ProviderTours />
                    </ProtectedRoute>
                  )}
                />
                <Route
                  path="my-tours/:id/details"
                  element={(
                    <ProtectedRoute allowedRoles={['tourProvider']}>
                      <ProviderTourDetails />
                    </ProtectedRoute>
                  )}
                />
                <Route
                  path="reported-reviews"
                  element={<Navigate to="/management/reviews?view=reported" replace />}
                />
                <Route
                  path="booking-requests"
                  element={(
                    <ProtectedRoute allowedRoles={['tourProvider']}>
                      <ProviderBookingRequests />
                    </ProtectedRoute>
                  )}
                />
              </Route>
            </Route>

            <Route path="/admin/accounts" element={<Navigate to="/management/accounts" replace />} />
            <Route path="/admin/roles" element={<Navigate to="/management/roles" replace />} />
            <Route path="/admin/activity-logs" element={<Navigate to="/management/activity-logs" replace />} />
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
