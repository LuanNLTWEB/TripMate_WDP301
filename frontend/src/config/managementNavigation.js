import { ACCESS_ROLES } from './accessControl.js';

export const MANAGEMENT_ROLES = ACCESS_ROLES.MANAGEMENT;

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
    roles: ACCESS_ROLES.ADMIN_ONLY
  },
  {
    key: 'roles',
    label: 'Quản lý vai trò',
    description: 'Tạo và quản lý các vai trò trong hệ thống',
    icon: 'bi-shield-lock',
    path: '/management/roles',
    roles: ACCESS_ROLES.ADMIN_ONLY
  },
  {
    key: 'activity-logs',
    label: 'Nhật ký hoạt động',
    description: 'Xem lịch sử thao tác của quản trị viên',
    icon: 'bi-clock-history',
    path: '/management/activity-logs',
    roles: ACCESS_ROLES.ADMIN_ONLY
  },
  {
    key: 'destinations',
    label: 'Quản lý điểm đến',
    description: 'Tạo và cập nhật thông tin điểm đến',
    icon: 'bi-geo-alt',
    path: '/management/destinations',
    roles: ACCESS_ROLES.STAFF_ONLY
  },
  {
    key: 'categories',
    label: 'Quản lý danh mục',
    description: 'Sắp xếp danh mục điểm đến',
    icon: 'bi-tags',
    path: '/management/destination-categories',
    roles: ACCESS_ROLES.STAFF_ONLY
  },
  {
    key: 'tour-categories',
    label: 'Danh mục tour',
    description: 'Phân loại các tour du lịch',
    icon: 'bi-bookmark',
    path: '/management/tour-categories',
    roles: ACCESS_ROLES.STAFF_ONLY
  },
  {
    key: 'tours',
    label: 'Quản lý tour',
    description: 'Theo dõi và tạm ngưng tour vi phạm',
    icon: 'bi-map',
    path: '/management/tours',
    roles: ACCESS_ROLES.STAFF_ONLY
  },
  {
    key: 'pending-tours',
    label: 'Duyệt Tour Chờ',
    description: 'Kiểm duyệt các tour do khách hàng đề xuất',
    icon: 'bi-inbox',
    path: '/management/pending-tours',
    roles: ACCESS_ROLES.STAFF_ONLY
  },
  {
    key: 'reviews',
    label: 'Quản lý đánh giá',
    description: 'Kiểm duyệt đánh giá và xử lý báo cáo vi phạm',
    icon: 'bi-chat-square-quote',
    path: '/management/reviews',
    roles: ACCESS_ROLES.STAFF_ONLY
  },
  {
    key: 'announcements',
    label: 'Thông báo hệ thống',
    description: 'Quản lý thông báo dành cho người dùng TripMate',
    icon: 'bi-megaphone',
    path: '/management/announcements',
    roles: ACCESS_ROLES.STAFF_ONLY
  },
  {
    key: 'notifications',
    label: 'Quản lý thông báo',
    description: 'Tạo và xem danh sách thông báo người dùng',
    icon: 'bi-bell',
    path: '/management/notifications',
    roles: ACCESS_ROLES.STAFF_ONLY
  },
  {
    key: 'statistics',
    label: 'Thống kê',
    description: 'Theo dõi số liệu toàn hệ thống',
    icon: 'bi-bar-chart',
    path: '/management/statistics',
    roles: ACCESS_ROLES.STAFF_ONLY
  },
  {
    key: 'my-tours',
    label: 'Quản lý tour của tôi',
    description: 'Tạo mới, theo dõi và quản lý các tour do bạn cung cấp',
    icon: 'bi-map',
    path: '/management/my-tours',
    roles: ACCESS_ROLES.PROVIDER_ONLY
  },
  {
    key: 'booking-requests',
    label: 'Yêu cầu đặt tour',
    description: 'Theo dõi yêu cầu đặt tour từ khách hàng',
    icon: 'bi-journal-check',
    path: '/management/booking-requests',
    roles: ACCESS_ROLES.PROVIDER_ONLY
  }
];

export const canAccessManagement = (role) => MANAGEMENT_ROLES.includes(role);

export const getManagementNavigation = (role) => (
  managementNavigation.filter((item) => item.roles.includes(role))
);
