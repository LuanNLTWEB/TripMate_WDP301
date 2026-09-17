import { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

function ProtectedRoute({ allowedRoles, children }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const toast = useToast();
  const hasNotified = useRef(false);
  const isAllowed = !allowedRoles || allowedRoles.includes(user?.role);

  useEffect(() => {
    if (isAuthenticated && !isAllowed && !hasNotified.current) {
      hasNotified.current = true;
      toast.warning('Bạn không có quyền truy cập khu vực này.');
    }
  }, [isAllowed, isAuthenticated, toast]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!isAllowed) {
    return <Navigate to="/" replace />;
  }

  return children || <Outlet />;
}

export default ProtectedRoute;
