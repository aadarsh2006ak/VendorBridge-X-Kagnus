import React, { useState, useRef, useEffect } from 'react';
import { Menu, LogOut, User, Shield, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface TopbarProps {
  onToggleMobileMenu: () => void;
}

export function Topbar({ onToggleMobileMenu }: TopbarProps) {
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Admin';
      case 'PROCUREMENT_OFFICER':
        return 'Procurement Officer';
      case 'MANAGER':
        return 'Manager / Approver';
      case 'VENDOR':
        return 'Vendor Partner';
      default:
        return role;
    }
  };

  return (
    <header className="h-16 bg-surface border-b border-border-default px-4 lg:px-6 flex items-center justify-between shrink-0 z-30 select-none">
      {/* Brand & Mobile Hamburger */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-lg text-secondary hover:text-primary hover:bg-surface-2 transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-base shadow-sm">
            VB
          </div>
          <div>
            <span className="font-bold text-primary text-base tracking-tight block">
              VendorBridge
            </span>
            <span className="text-[10px] text-muted -mt-1 block">Procurement & ERP</span>
          </div>
        </div>
      </div>

      {/* User Avatar Menu (Right) */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          className="flex items-center gap-2.5 p-1.5 pl-2 rounded-full hover:bg-surface-2 transition-colors border border-transparent hover:border-border-default focus:outline-none focus:ring-2 focus:ring-brand"
          aria-expanded={isDropdownOpen}
          aria-haspopup="true"
        >
          <div className="text-right hidden sm:block pr-1">
            <span className="block text-xs font-semibold text-primary">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="block text-[10px] text-secondary font-medium">
              {user ? formatRoleLabel(user.role) : ''}
            </span>
          </div>

          <div className="w-8 h-8 rounded-full bg-brand-subtle border border-brand/30 flex items-center justify-center text-status-success font-semibold text-xs">
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </div>

          <ChevronDown className="w-3.5 h-3.5 text-muted hidden sm:block" />
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-64 rounded-xl bg-surface border border-border-default shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-4 py-3 border-b border-border-default/60 space-y-1">
              <p className="text-sm font-semibold text-primary">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted truncate">{user?.email}</p>
              <div className="pt-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-surface-2 text-secondary border border-border-default">
                  <Shield className="w-3 h-3 text-brand" />
                  {user ? formatRoleLabel(user.role) : ''}
                </span>
              </div>
            </div>

            <div className="p-1">
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-danger hover:bg-red-950/40 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
