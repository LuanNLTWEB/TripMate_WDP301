export const MANAGEMENT_ROLES = ['admin', 'staff'];

const managementNavigation = [
  {
    key: 'overview',
    label: 'Tổng quan',
    description: 'Truy cập nhanh các chức năng quản lý',
    icon: 'bi-grid-1x2',
    path: '/management',
    roles: MANAGEMENT_ROLES
  },
  {
    key: 'accounts',
    label: 'Quản lý tài khoản',
    description: 'Quản lý người dùng và phân quyền',
    icon: 'bi-people',
    path: '/management/accounts',
    roles: ['admin']
  },
  {
    key: 'destinations',
    label: 'Quản lý điểm đến',
    description: 'Tạo và cập nhật thông tin điểm đến',
    icon: 'bi-geo-alt',
    path: '/management/destinations',
    roles: MANAGEMENT_ROLES
  },
  {
    key: 'categories',
    label: 'Quản lý danh mục',
    description: 'Sắp xếp danh mục điểm đến',
    icon: 'bi-tags',
    path: '/management/destination-categories',
    roles: MANAGEMENT_ROLES
  },
  {
    key: 'tour-categories',
    label: 'Danh mục tour',
    description: 'Phân loại các tour du lịch',
    icon: 'bi-bookmark',
    path: '/management/tour-categories',
    roles: MANAGEMENT_ROLES
  },
  {
    key: 'tours',
    label: 'Quản lý tour',
    description: 'Theo dõi và tạm ngưng tour vi phạm',
    icon: 'bi-map',
    path: '/management/tours',
    roles: MANAGEMENT_ROLES
  },
  {
    key: 'statistics',
    label: 'Thống kê',
    description: 'Theo dõi số liệu toàn hệ thống',
    icon: 'bi-bar-chart',
    path: '/management/statistics',
    roles: MANAGEMENT_ROLES
  }
];

export const canAccessManagement = (role) => MANAGEMENT_ROLES.includes(role);

export const getManagementNavigation = (role) => (
  managementNavigation.filter((item) => item.roles.includes(role))
);
