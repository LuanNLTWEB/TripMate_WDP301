import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../Navbar';
import ManagementSidebar from './ManagementSidebar';

function ManagementLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('tripmate_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  return (
    <div className="management-root">
      <Navbar />
      <div className={`management-shell ${isCollapsed ? 'is-collapsed' : ''}`}>
        <button
          type="button"
          className="management-sidebar-toggle btn btn-primary"
          onClick={() => setIsSidebarOpen(true)}
          title="Mở menu quản lý"
          aria-label="Mở menu quản lý"
        >
          <i className="bi bi-layout-sidebar"></i>
        </button>

        {isSidebarOpen && (
          <button
            type="button"
            className="management-sidebar-backdrop"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Đóng menu quản lý"
          ></button>
        )}

        <ManagementSidebar
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
                localStorage.setItem('tripmate_sidebar_collapsed', 'false');
              } catch {}
            }}
            title="Mở menu quản lý"
            aria-label="Mở menu quản lý"
          >
            <i className="bi bi-layout-sidebar"></i>
          </button>
        )}

        <main className="management-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default ManagementLayout;
