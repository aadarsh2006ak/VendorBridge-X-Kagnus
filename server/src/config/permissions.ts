export const RoleEnum = {
  ADMIN: 'ADMIN',
  PROCUREMENT_OFFICER: 'PROCUREMENT_OFFICER',
  MANAGER: 'MANAGER',
  VENDOR: 'VENDOR',
} as const;

export type RoleType = (typeof RoleEnum)[keyof typeof RoleEnum];

export const PERMISSIONS = {
  'vendor:read': ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER'],
  'vendor:create': ['ADMIN', 'PROCUREMENT_OFFICER'],
  'vendor:update': ['ADMIN', 'PROCUREMENT_OFFICER'],
  'vendor:delete': ['ADMIN'],
  'dashboard:read': ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VENDOR'],
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;
