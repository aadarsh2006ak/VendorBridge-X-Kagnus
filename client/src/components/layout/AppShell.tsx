import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas flex flex-col antialiased text-primary">
      {/* Topbar */}
      <Topbar onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)} />

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar (Fixed 240px width) */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* Mobile Drawer Sidebar (< 1024px) */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            {/* Drawer */}
            <div className="relative z-10 w-64 max-w-[80vw] h-full shadow-2xl">
              <Sidebar onCloseMobile={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        )}

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto bg-canvas">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppShell;
