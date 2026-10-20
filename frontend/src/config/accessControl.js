const freezeRoles = (...roles) => Object.freeze(roles);

export const ACCESS_ROLES = Object.freeze({
  ADMIN_ONLY: freezeRoles('admin'),
  STAFF_ONLY: freezeRoles('staff'),
  PROVIDER_ONLY: freezeRoles('tourProvider'),
  CUSTOMER_ONLY: freezeRoles('customer'),
  MANAGEMENT: freezeRoles('admin', 'staff', 'tourProvider'),
  ANNOUNCEMENT_VIEW: freezeRoles('staff', 'customer', 'tourProvider')
});

export const canAccessRoleGroup = (role, allowedRoles) => (
  Boolean(role) && allowedRoles.includes(role)
);
