export const ANNOUNCEMENT_AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Tất cả người dùng', icon: 'bi-people' },
  { value: 'customer', label: 'Khách hàng', icon: 'bi-person' },
  { value: 'tourProvider', label: 'Nhà cung cấp tour', icon: 'bi-building' }
];

const AUDIENCE_PRESENTATION = {
  all: {
    label: 'Tất cả người dùng',
    icon: 'bi-people',
    theme: 'theme-all',
    iconClass: 'bi-megaphone-fill',
    iconBg: '#eff6ff',
    iconColor: '#2563eb',
    accentColor: '#2563eb',
    className: 'badge-primary'
  },
  customer: {
    label: 'Khách du lịch',
    icon: 'bi-person',
    theme: 'theme-customer',
    iconClass: 'bi-people-fill',
    iconBg: '#ecfdf5',
    iconColor: '#059669',
    accentColor: '#059669',
    className: 'badge-success'
  },
  tourProvider: {
    label: 'Nhà cung cấp tour',
    icon: 'bi-building',
    theme: 'theme-provider',
    iconClass: 'bi-buildings-fill',
    iconBg: '#eef2ff',
    iconColor: '#7c3aed',
    accentColor: '#7c3aed',
    className: 'badge-warning'
  }
};

export const getAnnouncementAudience = (audience) => (
  AUDIENCE_PRESENTATION[audience] || AUDIENCE_PRESENTATION.all
);

export const getAnnouncementStatus = (isActive) => (
  isActive
    ? { label: 'Đang phát hành', className: 'badge-success' }
    : { label: 'Bản nháp', className: 'badge-secondary' }
);

export const formatAnnouncementDateTime = (value) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(value));
};
