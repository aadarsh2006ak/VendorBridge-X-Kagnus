export const RoleEnum = {
  ADMIN: 'ADMIN',
  PROCUREMENT_OFFICER: 'PROCUREMENT_OFFICER',
  MANAGER: 'MANAGER',
  VENDOR: 'VENDOR',
} as const;

export type RoleType = (typeof RoleEnum)[keyof typeof RoleEnum];

export const PERMISSIONS = {
  // Week 1 Vendor Management
  'vendor:read': ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER'],
  'vendor:create': ['ADMIN', 'PROCUREMENT_OFFICER'],
  'vendor:update': ['ADMIN', 'PROCUREMENT_OFFICER'],
  'vendor:delete': ['ADMIN'],
  'vendor:linkMember': ['ADMIN', 'PROCUREMENT_OFFICER'],
  'vendor:setRating': ['ADMIN', 'PROCUREMENT_OFFICER'],
  'dashboard:read': ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VENDOR'],

  // Week 2 RFQ Management
  'rfq:read': ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER'],
  'rfq:create': ['ADMIN', 'PROCUREMENT_OFFICER'],
  'rfq:update': ['ADMIN', 'PROCUREMENT_OFFICER'],
  'rfq:delete': ['ADMIN'],
  'rfq:publish': ['ADMIN', 'PROCUREMENT_OFFICER'],
  'rfq:close': ['ADMIN', 'PROCUREMENT_OFFICER'],
  'rfq:cancel': ['ADMIN', 'PROCUREMENT_OFFICER'],
  'rfq:select': ['ADMIN', 'PROCUREMENT_OFFICER'],

  // Week 2 Quotation & Comparison Management
  'quotation:read': ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER'],
  'quotation:compare': ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER'],
  'quotation:submit': ['VENDOR'],
  'vendorPortal:use': ['VENDOR'],
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;
