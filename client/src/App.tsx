import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';

// Layout & Route Guards
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/routes/ProtectedRoute';
import { RoleRoute } from './components/routes/RoleRoute';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

// Active Functional Pages (Week 1)
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { VendorsPage } from './pages/vendors/VendorsPage';

// Placeholders for Later Weeks
import { RfqsPage } from './pages/placeholders/RfqsPage';
import { QuotationsPage } from './pages/placeholders/QuotationsPage';
import { ApprovalsPage } from './pages/placeholders/ApprovalsPage';
import { PurchaseOrdersPage } from './pages/placeholders/PurchaseOrdersPage';
import { InvoicesPage } from './pages/placeholders/InvoicesPage';
import { ReportsPage } from './pages/placeholders/ReportsPage';
import { ActivityPage } from './pages/placeholders/ActivityPage';

// Error & Status Pages
import { ForbiddenPage } from './pages/ForbiddenPage';
import { NotFoundPage } from './pages/NotFoundPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 30, // 30 seconds
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Protected App Shell */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppShell />}>
                  {/* Default redirect to /dashboard */}
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />

                  {/* Screen 3: Dashboard (All roles) */}
                  <Route path="/dashboard" element={<DashboardPage />} />

                  {/* Screen 4: Vendors (Admin, Procurement Officer, Manager) */}
                  <Route
                    element={
                      <RoleRoute
                        allowedRoles={['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER']}
                      />
                    }
                  >
                    <Route path="/vendors" element={<VendorsPage />} />
                  </Route>

                  {/* Placeholder Modules (Screens 5 - 11) */}
                  <Route path="/rfqs" element={<RfqsPage />} />
                  <Route path="/quotations" element={<QuotationsPage />} />
                  <Route
                    element={
                      <RoleRoute
                        allowedRoles={['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER']}
                      />
                    }
                  >
                    <Route path="/approvals" element={<ApprovalsPage />} />
                  </Route>
                  <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
                  <Route path="/invoices" element={<InvoicesPage />} />
                  <Route
                    element={
                      <RoleRoute
                        allowedRoles={['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER']}
                      />
                    }
                  >
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/activity" element={<ActivityPage />} />
                  </Route>
                </Route>
              </Route>

              {/* Error Pages */}
              <Route path="/forbidden" element={<ForbiddenPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
