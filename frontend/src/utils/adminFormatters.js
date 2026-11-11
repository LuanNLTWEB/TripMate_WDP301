/**
 * Shared formatters and badge/label metadata for Admin management views.
 */

export const ROLE_LABELS = {
  admin: 'Quản trị viên',
  staff: 'Nhân viên',
  tourProvider: 'Tour Provider',
  customer: 'Khách hàng',
  user: 'Khách hàng'
};

export const ROLE_BADGE_CLASSES = {
  admin: 'badge-warning',
  staff: 'badge-info',
  tourProvider: 'badge-primary',
  customer: 'badge-secondary',
  user: 'badge-secondary'
};

export const ROLE_SOLID_BADGE_CLASSES = {
  admin: 'bg-warning text-dark',
  staff: 'bg-info text-dark',
  tourProvider: 'bg-primary text-white',
  customer: 'bg-secondary text-white',
  user: 'bg-secondary text-white'
};

/**
 * Normalizes a role key and resolves Vietnamese label and unified badge class.
 */
export function getRoleMeta(role) {
  const key = role === 'user' ? 'customer' : role;
  return {
    key,
    label: ROLE_LABELS[key] || role || 'Không rõ',
    badgeClass: ROLE_BADGE_CLASSES[key] || 'badge-secondary',
    solidBadgeClass: ROLE_SOLID_BADGE_CLASSES[key] || 'bg-secondary text-white'
  };
}

/**
 * Resolves unified management badge styling and Vietnamese label for account active state.
 */
export function getAccountStatusMeta(isActive) {
  return isActive
    ? { label: 'Đang hoạt động', badgeClass: 'badge-success' }
    : { label: 'Đã vô hiệu hóa', badgeClass: 'badge-danger' };
}

/**
 * Formats a date string using Vietnamese locale short date format.
 */
export function formatAdminDate(dateValue) {
  if (!dateValue) return '—';
  return new Date(dateValue).toLocaleDateString('vi-VN');
}

/**
 * Formats a timestamp with date and time for audit logs.
 */
export function formatAdminDateTime(dateValue) {
  if (!dateValue) return '—';
  return new Date(dateValue).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}
