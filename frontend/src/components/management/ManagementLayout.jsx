import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import Navbar from '../Navbar';
import { useAuth } from '../../hooks/useAuth';
import { getManagementNavigation } from '../../config/managementNavigation';

function ManagementLayout() {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigation = getManagementNavigation(user?.role);
  const roleLabel = user?.role === 'admin' ? 'Quản trị viên' : 'Nhân viên';

  return (
    <div className="management-root">
      <Navbar />
      <div className="management-shell">
        <button
          type="button"
          className="management-sidebar-toggle btn btn-primary"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Mở menu quản lý"
        >
          <i className="bi bi-list"></i>
          <span>Menu quản lý</span>
        </button>

        {isSidebarOpen && (
          <button
            type="button"
            className="management-sidebar-backdrop"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Đóng menu quản lý"
          ></button>
        )}

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
            {navigation.map((item) => (
              <NavLink
                key={item.key}
                to={item.path}
                end={item.end || item.path === '/management'}
                className={({ isActive }) => `management-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setIsSidebarOpen(false)}
              >
                <i className={`bi ${item.icon}`}></i>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

        </aside>

        <main className="management-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default ManagementLayout;
