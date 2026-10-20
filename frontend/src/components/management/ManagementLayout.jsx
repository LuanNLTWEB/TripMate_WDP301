import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../Navbar';
import ManagementSidebar from './ManagementSidebar';

function ManagementLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

        <ManagementSidebar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />

        <main className="management-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default ManagementLayout;
