import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getManagementNavigation } from '../../config/managementNavigation';

export function checkIsActive(item, location, user) {
  const { pathname, search, state } = location;
  const searchParams = new URLSearchParams(search);
  const from = searchParams.get('from') || state?.from;

  // 1. Overview dashboard: only exact '/management' or '/management/'
  if (item.path === '/management') {
    return pathname === '/management' || pathname === '/management/';
  }

  // 2. Public tour view /tours/:id when viewed in management mode
  if (pathname.startsWith('/tours/')) {
    if (user?.role === 'tourProvider') {
      return item.key === 'my-tours';
    }
    return item.key === 'tours';
  }

  // 3. Tour Review route: /management/tours/:id
  if (pathname.startsWith('/management/tours/')) {
    if (from === 'pending-tours') {
      return item.key === 'pending-tours';
    }
    return item.key === 'tours';
  }

  // 4. Pending Tours route
  if (pathname === '/management/pending-tours' || pathname.startsWith('/management/pending-tours/')) {
    return item.key === 'pending-tours';
  }

  // 5. Tour Categories vs Tours
  if (item.key === 'tour-categories') {
    return pathname === '/management/tour-categories' || pathname.startsWith('/management/tour-categories/');
  }
  if (item.key === 'tours') {
    return pathname === '/management/tours';
  }

  // 6. Destination Categories vs Destinations
  if (item.key === 'categories') {
    return pathname === '/management/destination-categories' || pathname.startsWith('/management/destination-categories/');
  }
  if (item.key === 'destinations') {
    return pathname === '/management/destinations' || pathname.startsWith('/management/destinations/');
  }

  // 7. Provider Tours & Booking Requests
  if (item.key === 'my-tours') {
    if (from === 'booking-requests') return false;
    return pathname === '/management/my-tours' || pathname.startsWith('/management/my-tours/');
  }
  if (item.key === 'booking-requests') {
    if (from === 'booking-requests') return true;
    return pathname === '/management/booking-requests' || pathname.startsWith('/management/booking-requests/');
  }

  // 8. Reviews
  if (item.key === 'reviews') {
    return pathname === '/management/reviews' || pathname.startsWith('/management/reviews/') || pathname === '/management/reported-reviews';
  }

  // 9. General prefix match for remaining items (announcements, accounts, roles, activity-logs, statistics, etc.)
  if (item.path && item.path !== '/management') {
    return pathname === item.path || pathname.startsWith(`${item.path}/`);
  }

  return false;
}

export default function ManagementSidebar({ isSidebarOpen, setIsSidebarOpen }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigation = getManagementNavigation(user?.role);
  const roleLabel = user?.role === 'admin' ? 'Quản trị viên' : user?.role === 'tourProvider' ? 'Nhà cung cấp' : 'Nhân viên';

  return (
    <aside className={`management-sidebar ${isSidebarOpen ? 'is-open' : ''}`}>
      <div className="management-sidebar-header">
        <div>
          <span className="management-sidebar-eyebrow">Khu vực quản lý</span>
          <strong>{roleLabel}</strong>
        </div>
        <button
          type="button"
          className="btn-close d-lg-none"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Đóng menu"
        ></button>
      </div>

      <nav className="management-navigation" aria-label="Điều hướng quản lý">
        {navigation.map((item) => {
          const active = checkIsActive(item, location, user);
          return (
            <NavLink
              key={item.key}
              to={item.path}
              end={true}
              className={`management-nav-link ${active ? 'active' : ''}`}
              onClick={() => setIsSidebarOpen(false)}
            >
              <i className={`bi ${item.icon}`}></i>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
