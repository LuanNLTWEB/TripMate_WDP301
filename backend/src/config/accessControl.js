const freezeRoles = (...roles) => Object.freeze(roles);

export const ACCESS_ROLES = Object.freeze({
  ADMIN_ONLY: freezeRoles('admin'),
  STAFF_ONLY: freezeRoles('staff'),
  PROVIDER_ONLY: freezeRoles('tourProvider'),
  CUSTOMER_ONLY: freezeRoles('customer'),
  REVIEW_REMOVE: freezeRoles('customer', 'staff'),
  ANNOUNCEMENT_VIEW: freezeRoles('staff', 'customer', 'tourProvider'),
  TOUR_SCHEDULE_VIEW: freezeRoles('customer', 'tourProvider'),
  CONTENT_UPLOAD: freezeRoles('staff', 'tourProvider')
});
