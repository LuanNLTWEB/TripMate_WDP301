import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getManagementNavigation } from '../config/managementNavigation';

function ManagementOverview() {
  const { user } = useAuth();
  const actions = getManagementNavigation(user?.role).filter((item) => item.key !== 'overview');
  const roleLabel = user?.role === 'admin' ? 'Quản trị viên' : 'Nhân viên';

  return (
    <section className="management-overview">
      <div className="management-page-heading">
        <span className="management-page-kicker">TripMate Management</span>
        <h1>Xin chào, {user?.username}</h1>
        <p>{roleLabel} có thể chọn một chức năng bên dưới để bắt đầu quản lý hệ thống.</p>
      </div>

      <div className="row g-4">
        {actions.map((item) => (
          <div className="col-12 col-md-6" key={item.key}>
            <Link className="management-action-card" to={item.path}>
              <span className="management-action-icon">
                <i className={`bi ${item.icon}`}></i>
              </span>
              <span className="management-action-copy">
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
              <i className="bi bi-arrow-right management-action-arrow"></i>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ManagementOverview;
