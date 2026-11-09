import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../Navbar';
import CustomerSidebar from './CustomerSidebar';

export default function CustomerLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('tripmate_customer_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  return (
    <div className="management-root customer-management-root">
      <Navbar />
      <div className={`management-shell ${isCollapsed ? 'is-collapsed' : ''}`}>
        <button
          type="button"
          className="management-sidebar-toggle btn btn-primary"
          onClick={() => setIsSidebarOpen(true)}
          title="Mở menu tài khoản"
          aria-label="Mở menu tài khoản"
        >
          <i className="bi bi-layout-sidebar"></i>
        </button>

        {isSidebarOpen && (
          <button
            type="button"
            className="management-sidebar-backdrop"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Đóng menu tài khoản"
          ></button>
        )}

        <CustomerSidebar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />

        {/* Docked Icon when collapsed on desktop */}
        {isCollapsed && (
          <button
            type="button"
            className="management-docked-toggle d-none d-md-flex"
            onClick={() => {
              setIsCollapsed(false);
              try {
                localStorage.setItem('tripmate_customer_sidebar_collapsed', 'false');
              } catch {}
            }}
            title="Mở menu tài khoản"
            aria-label="Mở menu tài khoản"
          >
            <i className="bi bi-layout-sidebar"></i>
          </button>
        )}

        <main className="management-content customer-management-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
