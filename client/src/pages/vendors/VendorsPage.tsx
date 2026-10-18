import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Eye,
  MoreVertical,
  Edit2,
  Trash2,
  RefreshCw,
  Building2,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api, getErrorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { VendorModal } from './VendorModal';
import { VendorDrawer } from './VendorDrawer';
import { cn } from '../../lib/utils';

const CATEGORIES = [
  'All Categories',
  'IT Hardware',
  'IT Services',
  'Furniture',
  'Stationery',
  'Logistics',
  'Construction',
  'Other',
];

export function VendorsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL-driven query state for shareability & persistence
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const search = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || '';
  const categoryFilter = searchParams.get('category') || '';

  // Local debounced search input state
  const [searchInput, setSearchInput] = useState(search);

  // Modals & Drawers state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [vendorToEdit, setVendorToEdit] = useState<any | null>(null);
  const [vendorToView, setVendorToView] = useState<any | null>(null);
  const [vendorToDelete, setVendorToDelete] = useState<any | null>(null);
  const [activeKebabId, setActiveKebabId] = useState<string | null>(null);

  // Sync debounced search to URL
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (searchInput.trim()) {
          next.set('search', searchInput.trim());
        } else {
          next.delete('search');
        }
        next.set('page', '1'); // Reset to page 1 on search
        return next;
      });
    }, 300);

    return () => clearTimeout(handler);
  }, [searchInput, setSearchParams]);

  // Open modal if URL has ?action=new
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setIsCreateModalOpen(true);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('action');
        return next;
      });
    }
  }, [searchParams, setSearchParams]);

  // Fetch Vendors Query
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['vendors', { page, limit, search, status: statusFilter, category: categoryFilter }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter && categoryFilter !== 'All Categories') params.category = categoryFilter;

      const res = await api.get('/vendors', { params });
      return res.data;
    },
  });

  // Delete Vendor Mutation (Admin only)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/vendors/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      success('Vendor Removed', `Vendor record was successfully deleted.`);
      setVendorToDelete(null);
    },
    onError: (err) => {
      toastError('Delete Failed', getErrorMessage(err));
    },
  });

  const canCreate = user?.role === 'ADMIN' || user?.role === 'PROCUREMENT_OFFICER';
  const canEdit = user?.role === 'ADMIN' || user?.role === 'PROCUREMENT_OFFICER';
  const canDelete = user?.role === 'ADMIN';

  const handleStatusFilterChange = (status: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (status) {
        next.set('status', status);
      } else {
        next.delete('status');
      }
      next.set('page', '1');
      return next;
    });
  };

  const handleCategoryFilterChange = (category: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (category && category !== 'All Categories') {
        next.set('category', category);
      } else {
        next.delete('category');
      }
      next.set('page', '1');
      return next;
    });
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', newPage.toString());
      return next;
    });
  };

  const counts = data?.counts || { all: 0, active: 0, pending: 0, blocked: 0 };
  const vendors = data?.data || [];
  const meta = data?.meta || { page: 1, limit: 10, total: 0, totalPages: 1 };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header (Screen 4) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-default/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">Vendors</h1>
          <p className="text-sm text-secondary">Manage supplier profiles and registrations</p>
        </div>

        {canCreate && (
          <Button
            variant="primary"
            size="md"
            className="gap-2 shadow-md shrink-0 self-start sm:self-auto"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            + Add Vendor
          </Button>
        )}
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="space-y-3">
        {/* Search Input */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search for vendor by name, GSTIN, category, or contact..."
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface border border-border-default text-primary placeholder:text-muted text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
          />
          {isFetching && (
            <RefreshCw className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted animate-spin" />
          )}
        </div>

        {/* Status Filter Chips + Category Select */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Chips */}
          <div className="flex flex-wrap items-center gap-2 select-none">
            <button
              onClick={() => handleStatusFilterChange('')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5',
                statusFilter === ''
                  ? 'bg-brand text-white border-brand shadow-xs'
                  : 'bg-surface border-border-default text-secondary hover:text-primary hover:bg-surface-2'
              )}
            >
              <span>All</span>
              <span className="opacity-80">({counts.all})</span>
            </button>

            <button
              onClick={() => handleStatusFilterChange('ACTIVE')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5',
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-900/80 text-status-success border-status-success/50'
                  : 'bg-surface border-border-default text-secondary hover:text-primary hover:bg-surface-2'
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
              <span>Active</span>
              <span className="opacity-80">({counts.active})</span>
            </button>

            <button
              onClick={() => handleStatusFilterChange('PENDING')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5',
                statusFilter === 'PENDING'
                  ? 'bg-amber-900/80 text-status-warning border-status-warning/50'
                  : 'bg-surface border-border-default text-secondary hover:text-primary hover:bg-surface-2'
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-status-warning" />
              <span>Pending</span>
              <span className="opacity-80">({counts.pending})</span>
            </button>

            <button
              onClick={() => handleStatusFilterChange('BLOCKED')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5',
                statusFilter === 'BLOCKED'
                  ? 'bg-red-900/80 text-status-danger border-status-danger/50'
                  : 'bg-surface border-border-default text-secondary hover:text-primary hover:bg-surface-2'
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-status-danger" />
              <span>Blocked</span>
              <span className="opacity-80">({counts.blocked})</span>
            </button>
          </div>

          {/* Category Dropdown Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted shrink-0 hidden sm:block" />
            <select
              value={categoryFilter || 'All Categories'}
              onChange={(e) => handleCategoryFilterChange(e.target.value)}
              className="h-9 px-3 rounded-lg bg-surface border border-border-default text-primary text-xs focus:outline-none focus:border-brand"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-surface text-primary">
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Vendors DataTable (6 Columns per Wireframe) */}
      <div className="rounded-xl border border-border-default bg-surface overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border-default bg-surface-2 text-xs font-semibold text-secondary uppercase tracking-wider">
                <th scope="col" className="py-3.5 px-4 sm:px-6">
                  Vendor Name
                </th>
                <th scope="col" className="py-3.5 px-4 hidden md:table-cell">
                  Category
                </th>
                <th scope="col" className="py-3.5 px-4">
                  GST No.
                </th>
                <th scope="col" className="py-3.5 px-4 hidden sm:table-cell">
                  Contact No.
                </th>
                <th scope="col" className="py-3.5 px-4">
                  Status
                </th>
                <th scope="col" className="py-3.5 px-4 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default/60">
              {isLoading ? (
                // Loading Skeleton Rows
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-4 sm:px-6">
                      <Skeleton className="h-4 w-36 mb-1" />
                      <Skeleton className="h-3 w-24 md:hidden" />
                    </td>
                    <td className="py-4 px-4 hidden md:table-cell">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="py-4 px-4">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="py-4 px-4 hidden sm:table-cell">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="py-4 px-4">
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Skeleton className="h-8 w-16 ml-auto rounded-lg" />
                    </td>
                  </tr>
                ))
              ) : isError ? (
                // Error State
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="space-y-3 max-w-sm mx-auto">
                      <p className="text-sm text-danger font-medium">
                        {getErrorMessage(error)}
                      </p>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>
                        Retry Loading
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : vendors.length === 0 ? (
                // Empty State
                <tr>
                  <td colSpan={6} className="py-12">
                    <EmptyState
                      icon={Building2}
                      title={search || statusFilter ? 'No matching vendors' : 'No vendors registered'}
                      description={
                        search || statusFilter
                          ? 'Try adjusting your search terms or status filters.'
                          : 'Get started by onboarding your first supplier to VendorBridge.'
                      }
                      actionLabel={canCreate && !search && !statusFilter ? '+ Add First Vendor' : undefined}
                      onAction={canCreate ? () => setIsCreateModalOpen(true) : undefined}
                    />
                  </td>
                </tr>
              ) : (
                // Vendor Data Rows
                vendors.map((vendor: any) => (
                  <tr
                    key={vendor.id}
                    className="hover:bg-surface-2/60 transition-colors group cursor-pointer"
                    onClick={() => setVendorToView(vendor)}
                  >
                    {/* 1. Vendor Name */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="font-semibold text-primary truncate max-w-xs group-hover:text-brand-hover transition-colors">
                        {vendor.name}
                      </div>
                      <div className="text-xs text-muted md:hidden">{vendor.category}</div>
                    </td>

                    {/* 2. Category */}
                    <td className="py-3.5 px-4 hidden md:table-cell text-secondary text-xs">
                      {vendor.category}
                    </td>

                    {/* 3. GST No. (Monospace per design) */}
                    <td className="py-3.5 px-4 font-mono text-xs text-secondary font-medium tracking-wide">
                      {vendor.gstNumber}
                    </td>

                    {/* 4. Contact No. */}
                    <td className="py-3.5 px-4 hidden sm:table-cell text-xs text-secondary">
                      {vendor.contactPhone}
                    </td>

                    {/* 5. Status Badge */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={vendor.status} />
                    </td>

                    {/* 6. Action Column (View button + kebab menu) */}
                    <td
                      className="py-3.5 px-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-xs gap-1"
                          onClick={() => setVendorToView(vendor)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </Button>

                        {(canEdit || canDelete) && (
                          <div className="relative">
                            <button
                              onClick={() =>
                                setActiveKebabId(activeKebabId === vendor.id ? null : vendor.id)
                              }
                              className="p-1 rounded-md text-muted hover:text-primary hover:bg-surface-2"
                              aria-label="More actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeKebabId === vendor.id && (
                              <div
                                className="absolute right-0 mt-1 w-36 rounded-lg bg-surface border border-border-default shadow-xl py-1 z-30 animate-in fade-in zoom-in-95"
                                onMouseLeave={() => setActiveKebabId(null)}
                              >
                                {canEdit && (
                                  <button
                                    onClick={() => {
                                      setActiveKebabId(null);
                                      setVendorToEdit(vendor);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-secondary hover:text-primary hover:bg-surface-2 transition-colors text-left"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    Edit
                                  </button>
                                )}

                                {canDelete && (
                                  <button
                                    onClick={() => {
                                      setActiveKebabId(null);
                                      setVendorToDelete(vendor);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-danger hover:bg-red-950/40 transition-colors text-left"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Pagination Footer */}
        {!isLoading && vendors.length > 0 && (
          <div className="p-4 border-t border-border-default bg-surface flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-secondary">
            <div>
              Showing{' '}
              <span className="font-semibold text-primary">
                {(meta.page - 1) * meta.limit + 1}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-primary">
                {Math.min(meta.page * meta.limit, meta.total)}
              </span>{' '}
              of <span className="font-semibold text-primary">{meta.total}</span> vendors
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page <= 1}
                onClick={() => handlePageChange(meta.page - 1)}
                className="h-8 px-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </Button>

              <span className="px-2 text-xs font-medium text-primary">
                Page {meta.page} of {meta.totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={meta.page >= meta.totalPages}
                onClick={() => handlePageChange(meta.page + 1)}
                className="h-8 px-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Modals & Drawers */}
      {/* Create / Edit Modal */}
      {(isCreateModalOpen || !!vendorToEdit) && (
        <VendorModal
          isOpen={isCreateModalOpen || !!vendorToEdit}
          onClose={() => {
            setIsCreateModalOpen(false);
            setVendorToEdit(null);
          }}
          vendorToEdit={vendorToEdit}
        />
      )}

      {/* View Details Drawer */}
      <VendorDrawer
        isOpen={!!vendorToView}
        onClose={() => setVendorToView(null)}
        vendor={vendorToView}
        onEdit={(v) => {
          setVendorToView(null);
          setVendorToEdit(v);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!vendorToDelete}
        onClose={() => setVendorToDelete(null)}
        onConfirm={() => deleteMutation.mutate(vendorToDelete.id)}
        title="Confirm Vendor Deletion"
        description={`Are you sure you want to delete "${vendorToDelete?.name}"? This vendor will be removed from the active vendor registry.`}
        confirmLabel="Delete Vendor"
        isDestructive
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

export default VendorsPage;
