export const NOTIFICATION_TARGET_OPTIONS = [
  {
    value: 'all',
    shortLabel: 'Tất cả người dùng',
    filterLabel: 'Tất cả người dùng',
    createLabel: 'Tất cả người dùng (Khách hàng, Nhà cung cấp, Nhân viên)',
    icon: 'bi-globe',
    badgeClass: 'bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25'
  },
  {
    value: 'customer',
    shortLabel: 'Khách hàng',
    filterLabel: 'Chỉ Khách hàng (Customer)',
    createLabel: 'Chỉ Khách hàng (Customer)',
    icon: 'bi-people',
    badgeClass: 'bg-success bg-opacity-10 text-success border border-success border-opacity-25'
  },
  {
    value: 'tourProvider',
    shortLabel: 'Nhà cung cấp',
    filterLabel: 'Chỉ Nhà cung cấp (Tour Provider)',
    createLabel: 'Chỉ Nhà cung cấp tour (Tour Provider)',
    icon: 'bi-building',
    badgeClass: 'bg-info bg-opacity-10 text-info border border-info border-opacity-25'
  },
  {
    value: 'staff',
    shortLabel: 'Nhân viên',
    filterLabel: 'Chỉ Nhân viên (Staff)',
    createLabel: 'Chỉ Nhân viên (Staff)',
    icon: 'bi-person-badge',
    badgeClass: 'bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25'
  },
  {
    value: 'specific_user',
    shortLabel: 'Người dùng',
    filterLabel: 'Người dùng cụ thể (Email)',
    createLabel: 'Gửi cho 1 người dùng cụ thể (nhập email)',
    icon: 'bi-envelope',
    badgeClass: 'bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25'
  }
];

const TARGET_META_MAP = Object.fromEntries(
  NOTIFICATION_TARGET_OPTIONS.map((option) => [option.value, option])
);

export const getNotificationTargetMeta = (targetType) => (
  TARGET_META_MAP[targetType] || TARGET_META_MAP.all
);

const TYPE_META_MAP = {
  system: {
    label: 'Hệ thống',
    iconClass: 'bi-bell-fill text-primary',
    badgeClass: 'bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25'
  },
  itinerary_invite: {
    label: 'Lời mời lịch trình',
    iconClass: 'bi-envelope-paper-fill text-info',
    badgeClass: 'bg-info bg-opacity-10 text-info border border-info border-opacity-25'
  },
  itinerary_leave: {
    label: 'Cộng tác',
    iconClass: 'bi-box-arrow-right text-warning',
    badgeClass: 'bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25'
  },
  itinerary_transfer: {
    label: 'Chuyển quyền',
    iconClass: 'bi-arrow-left-right text-success',
    badgeClass: 'bg-success bg-opacity-10 text-success border border-success border-opacity-25'
  },
  tour_submission: {
    label: 'Duyệt tour',
    iconClass: 'bi-send-check-fill text-info',
    badgeClass: 'bg-info bg-opacity-10 text-info border border-info border-opacity-25'
  },
  tour_submission_result: {
    label: 'Kết quả duyệt tour',
    iconClass: 'bi-clipboard-check-fill text-success',
    badgeClass: 'bg-success bg-opacity-10 text-success border border-success border-opacity-25'
  },
  review_reply: {
    label: 'Phản hồi đánh giá',
    iconClass: 'bi-chat-quote-fill text-primary',
    badgeClass: 'bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25'
  }
};

export const getNotificationTypeMeta = (notificationType) => (
  TYPE_META_MAP[notificationType] || TYPE_META_MAP.system
);

export const getInboxTypeFilterOptions = (role) => {
  const options = [
    { value: 'all', label: 'Tất cả loại thông báo', icon: 'bi-collection' },
    { value: 'system', label: 'Thông báo hệ thống', icon: 'bi-bell-fill' }
  ];

  if (role === 'customer') {
    options.push(
      { value: 'itinerary_invite', label: 'Lời mời lịch trình', icon: 'bi-envelope-paper-fill' },
      { value: 'itinerary_leave', label: 'Thành viên rời lịch trình', icon: 'bi-box-arrow-right' },
      { value: 'itinerary_transfer', label: 'Chuyển quyền lịch trình', icon: 'bi-arrow-left-right' },
      { value: 'review_reply', label: 'Phản hồi đánh giá', icon: 'bi-chat-quote-fill' }
    );
  } else if (role === 'tourProvider') {
    options.push({ value: 'tour_submission_result', label: 'Kết quả duyệt tour', icon: 'bi-clipboard-check-fill' });
  } else if (role === 'staff') {
    options.push({ value: 'tour_submission', label: 'Yêu cầu duyệt tour', icon: 'bi-send-check-fill' });
  }

  return options;
};

export const formatNotificationDateTime = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};
