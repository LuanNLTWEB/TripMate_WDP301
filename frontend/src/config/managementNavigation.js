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
    key: 'roles',
    label: 'Quản lý vai trò',
    description: 'Tạo và quản lý các vai trò trong hệ thống',
    icon: 'bi-shield-lock',
    path: '/management/roles',
    roles: ['admin']
  },
  {
    key: 'destinations',
    label: 'Quản lý điểm đến',
    description: 'Tạo và cập nhật thông tin điểm đến',
    icon: 'bi-geo-alt',
    path: '/management/destinations',
    roles: ['staff']
  },
  {
    key: 'categories',
    label: 'Quản lý danh mục',
    description: 'Sắp xếp danh mục điểm đến',
    icon: 'bi-tags',
    path: '/management/destination-categories',
    roles: ['staff']
  },
  {
    key: 'tour-categories',
    label: 'Danh mục tour',
    description: 'Phân loại các tour du lịch',
    icon: 'bi-bookmark',
    path: '/management/tour-categories',
    roles: ['staff']
  },
  {
    key: 'tours',
    label: 'Quản lý tour',
    description: 'Theo dõi và tạm ngưng tour vi phạm',
    icon: 'bi-map',
    path: '/management/tours',
    end: true,
    roles: ['staff']
  },
  {
    key: 'pending-tours',
    label: 'Duyệt Tour Chờ',
    description: 'Kiểm duyệt các tour do khách hàng đề xuất',
    icon: 'bi-inbox',
    path: '/management/pending-tours',
    roles: ['staff']
  },
  {
    key: 'statistics',
    label: 'Thống kê',
    description: 'Theo dõi số liệu toàn hệ thống',
    icon: 'bi-bar-chart',
    path: '/management/statistics',
    roles: ['staff']
  }
];

export const canAccessManagement = (role) => MANAGEMENT_ROLES.includes(role);

export const getManagementNavigation = (role) => (
  managementNavigation.filter((item) => item.roles.includes(role))
);
