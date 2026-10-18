import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  FileText,
  Layers,
  CheckSquare,
  ShoppingBag,
  Receipt,
  BarChart3,
  Activity,
  X,
} from 'lucide-react';
import { useAuth, UserRole } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VENDOR'],
  },
  {
    label: 'Vendors',
    path: '/vendors',
    icon: Building2,
    roles: ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER'],
  },
  {
    label: "RFQ's",
    path: '/rfqs',
    icon: FileText,
    roles: ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VENDOR'],
  },
  {
    label: 'Quotations',
    path: '/quotations',
    icon: Layers,
    roles: ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VENDOR'],
  },
  {
    label: 'Approvals',
    path: '/approvals',
    icon: CheckSquare,
    roles: ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER'],
  },
  {
    label: 'Purchase orders',
    path: '/purchase-orders',
    icon: ShoppingBag,
    roles: ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VENDOR'],
  },
  {
    label: 'Invoices',
    path: '/invoices',
    icon: Receipt,
    roles: ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VENDOR'],
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: BarChart3,
    roles: ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER'],
  },
  {
    label: 'Activity',
    path: '/activity',
    icon: Activity,
    roles: ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER'],
  },
];

interface SidebarProps {
  onCloseMobile?: () => void;
}

export function Sidebar({ onCloseMobile }: SidebarProps) {
  const { user } = useAuth();
  const currentRole = user?.role || 'VENDOR';

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(currentRole));

  return (
    <aside className="w-60 bg-surface border-r border-border-default flex flex-col h-full shrink-0 select-none">
      {/* Brand header on mobile / desktop */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-border-default lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-sm">
            VB
          </div>
          <span className="font-semibold text-primary text-base">VendorBridge</span>
        </div>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-md text-muted hover:text-primary hover:bg-surface-2"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="p-3 space-y-1 flex-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-brand text-white shadow-sm font-semibold'
                    : 'text-secondary hover:text-primary hover:bg-surface-2'
                )
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Footer System Info */}
      <div className="p-4 border-t border-border-default text-xs text-muted flex items-center justify-between">
        <span>VendorBridge ERP</span>
        <span className="px-1.5 py-0.5 rounded bg-surface-2 text-[10px] text-brand border border-brand/20">
          v1.0 (W1)
        </span>
      </div>
    </aside>
  );
}
