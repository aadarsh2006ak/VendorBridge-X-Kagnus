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

  // Week 3 Approval Workflow
  'approval:read': ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER'],
  'approval:decide': ['ADMIN', 'MANAGER'],

  // Week 3 Purchase Orders
  'po:read': ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VENDOR'],
  'po:create': ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER'],

  // Week 3 Invoices
  'invoice:read': ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VENDOR'],
  'invoice:create': ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VENDOR'],
  'invoice:markPaid': ['ADMIN', 'MANAGER'],
  'invoice:email': ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER'],

  // Week 4 Notifications
  'notification:read': ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VENDOR'],
  'notification:update': ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VENDOR'],

  // Week 4 Audit & Activity Logs
  'audit:read': ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER'],

  // Week 4 Reports & Analytics
  'reports:read': ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER'],
  'reports:export': ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER'],
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;
