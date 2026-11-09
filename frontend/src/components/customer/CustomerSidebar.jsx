import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const CUSTOMER_NAVIGATION = [
  {
    key: 'my-bookings',
    label: 'Lịch sử đặt tour',
    description: 'Theo dõi và quản lý các đơn đặt tour',
    icon: 'bi-clock-history',
    path: '/my-bookings'
  },
  {
    key: 'itinerary',
    label: 'Lịch trình của tôi',
    description: 'Kế hoạch cá nhân và chuyến đi',
    icon: 'bi-calendar2-week',
    path: '/itinerary'
  },
  {
    key: 'favorites',
    label: 'Yêu thích',
    description: 'Danh sách điểm đến & tour đã lưu',
    icon: 'bi-heart',
    path: '/favorites'
  },
  {
    key: 'my-complaints',
    label: 'Khiếu nại của tôi',
    description: 'Theo dõi tiến độ giải quyết khiếu nại',
    icon: 'bi-exclamation-diamond',
    path: '/my-complaints'
  },
  {
    key: 'profile',
    label: 'Hồ sơ',
    description: 'Thông tin cá nhân và tài khoản',
    icon: 'bi-person',
    path: '/profile'
  }
];

const PROVIDER_NOTIFICATION_NAV = [
  {
    key: 'management-overview',
    label: 'Bảng điều khiển',
    icon: 'bi-grid-1x2',
    path: '/management'
  },
  {
    key: 'my-tours',
    label: 'Quản lý tour',
    icon: 'bi-map',
    path: '/management/my-tours'
  },
  {
    key: 'booking-requests',
    label: 'Yêu cầu đặt tour',
    icon: 'bi-journal-check',
    path: '/management/booking-requests'
  }
];

const STAFF_NOTIFICATION_NAV = [
  {
    key: 'management-overview',
    label: 'Bảng điều khiển',
    icon: 'bi-grid-1x2',
    path: '/management'
  },
  {
    key: 'staff-notifications',
    label: 'Quản lý thông báo',
    icon: 'bi-bell-fill',
    path: '/management/notifications'
  }
];

export function checkCustomerIsActive(item, location) {
  const { pathname } = location;
  if (item.key === 'my-bookings') {
    return pathname === '/my-bookings' || pathname.startsWith('/my-bookings/') || pathname === '/bookings' || pathname.startsWith('/bookings/');
  }
  if (item.key === 'itinerary') {
    return pathname === '/itinerary' || pathname.startsWith('/itinerary/');
  }
  if (item.key === 'favorites') {
    return pathname === '/favorites' || pathname.startsWith('/favorites/');
  }
  if (item.key === 'my-complaints') {
    return pathname === '/my-complaints' || pathname.startsWith('/my-complaints/');
  }
  if (item.key === 'profile') {
    return pathname === '/profile' || pathname.startsWith('/profile/');
  }
  if (item.key === 'management-overview') {
    return pathname === '/management';
  }
  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}

export default function CustomerSidebar({ isSidebarOpen, setIsSidebarOpen, isCollapsed, setIsCollapsed }) {
  const { user } = useAuth();
  const location = useLocation();

  const navigation = user?.role === 'tourProvider'
    ? PROVIDER_NOTIFICATION_NAV
    : user?.role === 'staff'
      ? STAFF_NOTIFICATION_NAV
      : CUSTOMER_NAVIGATION;

  const eyebrow = user?.role === 'customer' ? 'Tài khoản của tôi' : 'Khu vực quản lý';
  const roleTitle = user?.role === 'customer'
    ? (user?.name || user?.username || 'Khách hàng')
    : user?.role === 'tourProvider'
      ? 'Nhà cung cấp'
      : user?.role === 'staff'
        ? 'Nhân viên'
        : 'Người dùng';

  return (
    <aside className={`management-sidebar ${isSidebarOpen ? 'is-open' : ''} ${isCollapsed ? 'is-collapsed' : ''}`}>
      <div className="management-sidebar-header">
        <div>
          <span className="management-sidebar-eyebrow">{eyebrow}</span>
          <strong className="text-truncate d-block" style={{ maxWidth: '170px' }}>{roleTitle}</strong>
        </div>
        <div className="d-flex align-items-center gap-1">
          {/* Desktop collapse icon button */}
          {setIsCollapsed && (
            <button
              type="button"
              className="management-sidebar-header-toggle btn btn-sm p-0 d-none d-md-inline-flex align-items-center justify-content-center"
              onClick={() => {
                setIsCollapsed(true);
                try {
                  localStorage.setItem('tripmate_customer_sidebar_collapsed', 'true');
                } catch {}
              }}
              title="Thu gọn menu"
              aria-label="Thu gọn menu"
            >
              <i className="bi bi-layout-sidebar"></i>
            </button>
          )}
          {/* Mobile close button */}
          <button
            type="button"
            className="btn-close d-md-none"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Đóng menu"
          ></button>
        </div>
      </div>

      <nav className="management-navigation" aria-label="Điều hướng tài khoản">
        {navigation.map((item) => {
          const active = checkCustomerIsActive(item, location);
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
