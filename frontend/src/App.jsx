import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import AuthProvider from './context/AuthProvider';
import ToastProvider from './context/ToastProvider';
import ProtectedRoute from './components/ProtectedRoute';
import ManagementLayout from './components/management/ManagementLayout';
import { ACCESS_ROLES } from './config/accessControl';
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
import Announcements from './pages/Announcements';
import AnnouncementDetails from './pages/AnnouncementDetails';
import StaffAnnouncements from './pages/StaffAnnouncements';
import StaffAnnouncementDetails from './pages/StaffAnnouncementDetails';

function ProviderTourDetailsRedirect() {
  const { id } = useParams();
  return <Navigate to={`/management/my-tours/${id}/details`} replace />;
}

function RoleRedirect({ to, allowedRoles }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <Navigate to={to} replace />
    </ProtectedRoute>
  );
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
                <ProtectedRoute allowedRoles={ACCESS_ROLES.CUSTOMER_ONLY}>
                  <BookingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-bookings"
              element={
                <ProtectedRoute allowedRoles={ACCESS_ROLES.CUSTOMER_ONLY}>
                  <BookingHistory />
                </ProtectedRoute>
              }
            />
            <Route path="/bookings" element={<RoleRedirect to="/my-bookings" allowedRoles={ACCESS_ROLES.CUSTOMER_ONLY} />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/profile"
              element={(
                <ProtectedRoute allowedRoles={ACCESS_ROLES.CUSTOMER_ONLY}>
                  <Profile />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/itinerary"
              element={(
                <ProtectedRoute allowedRoles={ACCESS_ROLES.CUSTOMER_ONLY}>
                  <Itinerary />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/favorites"
              element={(
                <ProtectedRoute allowedRoles={ACCESS_ROLES.CUSTOMER_ONLY}>
                  <FavoriteDestinations />
                </ProtectedRoute>
              )}
            />
            <Route path="/about" element={<AboutVietnam />} />
            <Route
              path="/announcements"
              element={(
                <ProtectedRoute allowedRoles={ACCESS_ROLES.ANNOUNCEMENT_VIEW}>
                  <Announcements />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/announcements/:id"
              element={(
                <ProtectedRoute allowedRoles={ACCESS_ROLES.ANNOUNCEMENT_VIEW}>
                  <AnnouncementDetails />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/provider/create-tour"
              element={(
                <ProtectedRoute allowedRoles={ACCESS_ROLES.PROVIDER_ONLY}>
                  <Navigate to="/management/my-tours?action=create" replace />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/provider/tours/:id/details"
              element={(
                <ProtectedRoute allowedRoles={ACCESS_ROLES.PROVIDER_ONLY}>
                  <ProviderTourDetailsRedirect />
                </ProtectedRoute>
              )}
            />

            <Route element={<ProtectedRoute allowedRoles={MANAGEMENT_ROLES} />}>
              <Route path="/management" element={<ManagementLayout />}>
                <Route index element={<ManagementOverview />} />
                <Route
                  path="accounts"
                  element={(
                    <ProtectedRoute allowedRoles={ACCESS_ROLES.ADMIN_ONLY}>
                      <AdminAccounts />
                    </ProtectedRoute>
                  )}
                />
                <Route
                  path="roles"
                  element={(
                    <ProtectedRoute allowedRoles={ACCESS_ROLES.ADMIN_ONLY}>
                      <AdminRoles />
                    </ProtectedRoute>
                  )}
                />
                <Route
                  path="activity-logs"
                  element={(
                    <ProtectedRoute allowedRoles={ACCESS_ROLES.ADMIN_ONLY}>
                      <AdminActivityLogs />
                    </ProtectedRoute>
                  )}
                />
                <Route
                  path="reviews"
                  element={(
                    <ProtectedRoute allowedRoles={ACCESS_ROLES.STAFF_ONLY}>
                      <ManagementReviews />
                    </ProtectedRoute>
                  )}
                />
                <Route element={<ProtectedRoute allowedRoles={ACCESS_ROLES.STAFF_ONLY} />}>
                  <Route path="destinations" element={<StaffDestinations />} />
                  <Route path="destination-categories" element={<StaffDestinationCategories />} />
                  <Route path="tour-categories" element={<StaffTourCategories />} />
                  <Route path="tours" element={<StaffTours />} />
                  <Route path="tours/:id" element={<ReviewTourSubmission />} />
                  <Route path="pending-tours" element={<StaffPendingTours />} />
                  <Route path="statistics" element={<Stats />} />
                </Route>
                <Route element={<ProtectedRoute allowedRoles={ACCESS_ROLES.STAFF_ONLY} />}>
                  <Route path="announcements" element={<StaffAnnouncements />} />
                  <Route path="announcements/:id" element={<StaffAnnouncementDetails />} />
                </Route>
                <Route
                  path="my-tours"
                  element={(
                    <ProtectedRoute allowedRoles={ACCESS_ROLES.PROVIDER_ONLY}>
                      <ProviderTours />
                    </ProtectedRoute>
                  )}
                />
                <Route
                  path="my-tours/:id/details"
                  element={(
                    <ProtectedRoute allowedRoles={ACCESS_ROLES.PROVIDER_ONLY}>
                      <ProviderTourDetails />
                    </ProtectedRoute>
                  )}
                />
                <Route
                  path="reported-reviews"
                  element={<RoleRedirect to="/management/reviews?view=reported" allowedRoles={ACCESS_ROLES.STAFF_ONLY} />}
                />
                <Route
                  path="booking-requests"
                  element={(
                    <ProtectedRoute allowedRoles={ACCESS_ROLES.PROVIDER_ONLY}>
                      <ProviderBookingRequests />
                    </ProtectedRoute>
                  )}
                />
              </Route>
            </Route>

            <Route path="/admin/accounts" element={<RoleRedirect to="/management/accounts" allowedRoles={ACCESS_ROLES.ADMIN_ONLY} />} />
            <Route path="/admin/roles" element={<RoleRedirect to="/management/roles" allowedRoles={ACCESS_ROLES.ADMIN_ONLY} />} />
            <Route path="/admin/activity-logs" element={<RoleRedirect to="/management/activity-logs" allowedRoles={ACCESS_ROLES.ADMIN_ONLY} />} />
            <Route path="/staff/destinations" element={<RoleRedirect to="/management/destinations" allowedRoles={ACCESS_ROLES.STAFF_ONLY} />} />
            <Route path="/staff/destination-categories" element={<RoleRedirect to="/management/destination-categories" allowedRoles={ACCESS_ROLES.STAFF_ONLY} />} />
            <Route path="/staff/tour-categories" element={<RoleRedirect to="/management/tour-categories" allowedRoles={ACCESS_ROLES.STAFF_ONLY} />} />
            <Route path="/staff/tours" element={<RoleRedirect to="/management/tours" allowedRoles={ACCESS_ROLES.STAFF_ONLY} />} />
            <Route path="/stats" element={<RoleRedirect to="/management/statistics" allowedRoles={ACCESS_ROLES.STAFF_ONLY} />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
