import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Calendar,
  Building2,
  Package,
  Layers,
  Save,
  Send,
  AlertCircle,
  Star,
  CheckCircle2,
} from 'lucide-react';
import { api, getErrorMessage } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';

const CATEGORIES = [
  'IT Hardware',
  'IT Services',
  'Furniture',
  'Stationery',
  'Logistics',
  'Construction',
  'Other',
];

const COMMON_UNITS = ['Units', 'Pieces', 'Boxes', 'Sets', 'Kg', 'Meters', 'Hours', 'Months'];

interface LineItem {
  id?: string;
  name: string;
  description: string;
  quantity: number | '';
  unit: string;
}

export function CreateRfqPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<LineItem[]>([
    { name: '', description: '', quantity: '', unit: 'Units' },
  ]);
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  const [vendorCategoryFilter, setVendorCategoryFilter] = useState('All');
  const [vendorSearch, setVendorSearch] = useState('');
  const [version, setVersion] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch existing RFQ if editing
  const { data: existingRfqData, isLoading: isLoadingExisting } = useQuery({
    queryKey: ['rfq', id],
    queryFn: async () => {
      const res = await api.get(`/rfqs/${id}`);
      return res.data.data;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingRfqData) {
      setTitle(existingRfqData.title);
      setCategory(existingRfqData.category);
      if (existingRfqData.deadline) {
        // Format ISO string to datetime-local input value
        const d = new Date(existingRfqData.deadline);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        setDeadline(d.toISOString().slice(0, 16));
      }
      setDescription(existingRfqData.description || '');
      setVersion(existingRfqData.version || 1);
      if (existingRfqData.items && existingRfqData.items.length > 0) {
        setItems(
          existingRfqData.items.map((i: any) => ({
            id: i.id,
            name: i.name,
            description: i.description || '',
            quantity: Number(i.quantity),
            unit: i.unit,
          }))
        );
      }
      if (existingRfqData.vendors) {
        setSelectedVendorIds(existingRfqData.vendors.map((v: any) => v.vendorId));
      }
    }
  }, [existingRfqData]);

  // Fetch active vendors for assignment
  const { data: vendorsData, isLoading: isLoadingVendors } = useQuery({
    queryKey: ['vendors', 'active-list'],
    queryFn: async () => {
      const res = await api.get('/vendors', {
        params: { limit: 100, status: 'ACTIVE' },
      });
      return res.data.data;
    },
  });

  // Filter vendors
  const availableVendors = (vendorsData || []).filter((v: any) => {
    const matchesCat =
      vendorCategoryFilter === 'All' || v.category === vendorCategoryFilter;
    const matchesSearch =
      !vendorSearch ||
      v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      v.contactName.toLowerCase().includes(vendorSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Line item handlers
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { name: '', description: '', quantity: '', unit: 'Units' },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof LineItem, value: any) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  // Vendor selection toggle
  const toggleVendor = (vendorId: string) => {
    setSelectedVendorIds((prev) =>
      prev.includes(vendorId)
        ? prev.filter((i) => i !== vendorId)
        : [...prev, vendorId]
    );
  };

  const selectAllVendors = () => {
    const ids = availableVendors.map((v: any) => v.id);
    setSelectedVendorIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const deselectAllVendors = () => {
    const ids = new Set(availableVendors.map((v: any) => v.id));
    setSelectedVendorIds((prev) => prev.filter((id) => !ids.has(id)));
  };

  // Validation
  const validateForm = (isPublish: boolean) => {
    const errs: Record<string, string> = {};

    if (!title.trim() || title.length < 3) {
      errs.title = 'Title must be at least 3 characters';
    }

    if (!deadline) {
      errs.deadline = 'Submission deadline is required';
    } else if (new Date(deadline).getTime() <= Date.now()) {
      errs.deadline = 'Deadline must be in the future';
    }

    // Validate line items
    const validItems = items.filter((i) => i.name.trim());
    if (isPublish && validItems.length === 0) {
      errs.items = 'At least one line item is required to publish an RFQ';
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.name.trim() && (!it.quantity || Number(it.quantity) <= 0)) {
        errs[`item_${i}_qty`] = 'Quantity must be > 0';
      }
    }

    if (isPublish && selectedVendorIds.length === 0) {
      errs.vendors = 'At least one vendor must be assigned to publish an RFQ';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Mutation to create/save RFQ
  const saveMutation = useMutation({
    mutationFn: async ({ publish }: { publish: boolean }) => {
      const payload = {
        title: title.trim(),
        category,
        deadline: new Date(deadline).toISOString(),
        description: description.trim() || undefined,
        items: items
          .filter((i) => i.name.trim())
          .map((i) => ({
            id: i.id,
            name: i.name.trim(),
            description: i.description.trim() || undefined,
            quantity: Number(i.quantity) || 1,
            unit: i.unit.trim() || 'Units',
          })),
        assignedVendorIds: selectedVendorIds,
        publish,
      };

      if (isEditing) {
        return (
          await api.put(`/rfqs/${id}`, {
            ...payload,
            version,
          })
        ).data;
      } else {
        return (await api.post('/rfqs', payload)).data;
      }
    },
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      success(
        vars.publish
          ? 'RFQ published successfully and invited vendors notified!'
          : 'RFQ saved as draft successfully!'
      );
      navigate('/rfqs');
    },
    onError: (err) => {
      toastError(getErrorMessage(err));
    },
  });

  const handleSubmit = (publish: boolean) => {
    if (validateForm(publish)) {
      saveMutation.mutate({ publish });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default pb-5">
        <div className="flex items-center gap-3">
          <Link
            to="/rfqs"
            className="p-2 rounded-lg border border-border-default bg-surface hover:bg-surface-2 transition-colors text-secondary hover:text-primary"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-primary">
              {isEditing ? "Edit RFQ's" : "Create RFQ's"}
            </h1>
            <p className="text-sm text-secondary mt-0.5">
              new request for quotation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSubmit(false)}
            isLoading={saveMutation.isPending && !saveMutation.variables?.publish}
            disabled={saveMutation.isPending}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            Save as Draft
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => handleSubmit(true)}
            isLoading={saveMutation.isPending && saveMutation.variables?.publish}
            disabled={saveMutation.isPending}
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            Save & Send to Vendors
          </Button>
        </div>
      </div>

      {/* 3-Section Form Layout */}
      <div className="space-y-8">
        {/* SECTION 1: General Details */}
        <div className="bg-surface border border-border-default rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-3 border-b border-border-default">
            <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h2 className="text-lg font-semibold text-primary">General RFQ Details</h2>
              <p className="text-xs text-secondary">
                Basic request identification, category, and submission timeline.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <Input
                label="RFQ Title"
                placeholder="e.g. Q2 Enterprise Laptops & IT Hardware Refresh"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                error={errors.title}
                required
              />
            </div>

            <div>
              <Select
                label="Procurement Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={CATEGORIES.map((cat) => ({ label: cat, value: cat }))}
              />
            </div>

            <div>
              <Input
                label="Quotation Submission Deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                error={errors.deadline}
                required
                helperText="Vendors cannot submit or modify bids after this timestamp (BR-4)"
              />
            </div>

            <div className="md:col-span-2">
              <Textarea
                label="Scope & Detailed Requirements (Optional)"
                placeholder="Provide scope of work, technical specifications, delivery terms, or inspection criteria..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Items & Quantities */}
        <div className="bg-surface border border-border-default rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-6 pb-3 border-b border-border-default">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <h2 className="text-lg font-semibold text-primary">Items & Quantities</h2>
                <p className="text-xs text-secondary">
                  Specify products, services, required quantities, and units of measurement.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          </div>

          {errors.items && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/30 border border-rose-800/40 text-rose-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errors.items}</span>
            </div>
          )}

          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={index}
                className="p-4 rounded-lg bg-surface-2/40 border border-border-default space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                    Item #{index + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-secondary hover:text-status-danger p-1 rounded hover:bg-surface transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-5">
                    <input
                      type="text"
                      placeholder="Item name (e.g. ThinkPad T14 32GB RAM)"
                      value={item.name}
                      onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border-default rounded-lg text-sm text-primary placeholder:text-muted focus:outline-none focus:border-brand"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <input
                      type="text"
                      placeholder="Specs / description (optional)"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border-default rounded-lg text-sm text-primary placeholder:text-muted focus:outline-none focus:border-brand"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <input
                      type="number"
                      min="1"
                      step="any"
                      placeholder="Quantity"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      className={cn(
                        'w-full px-3 py-2 bg-surface border rounded-lg text-sm text-primary placeholder:text-muted focus:outline-none',
                        errors[`item_${index}_qty`]
                          ? 'border-status-danger'
                          : 'border-border-default focus:border-brand'
                      )}
                    />
                    {errors[`item_${index}_qty`] && (
                      <span className="text-[10px] text-status-danger mt-0.5 block">
                        {errors[`item_${index}_qty`]}
                      </span>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <select
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border-default rounded-lg text-sm text-primary focus:outline-none focus:border-brand"
                    >
                      {COMMON_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3: Vendor Assignment */}
        <div className="bg-surface border border-border-default rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-6 pb-3 border-b border-border-default">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div>
                <h2 className="text-lg font-semibold text-primary">Assign Vendors</h2>
                <p className="text-xs text-secondary">
                  Only selected Active vendors will receive this RFQ in their portal.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-brand/10 text-brand font-medium">
                {selectedVendorIds.length} Selected
              </span>
            </div>
          </div>

          {errors.vendors && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/30 border border-rose-800/40 text-rose-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errors.vendors}</span>
            </div>
          )}

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search vendors..."
                value={vendorSearch}
                onChange={(e) => setVendorSearch(e.target.value)}
                className="px-3 py-1.5 bg-surface-2 border border-border-default rounded-lg text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand w-full sm:w-48"
              />
              <select
                value={vendorCategoryFilter}
                onChange={(e) => setVendorCategoryFilter(e.target.value)}
                className="px-3 py-1.5 bg-surface-2 border border-border-default rounded-lg text-xs text-primary focus:outline-none focus:border-brand"
              >
                <option value="All">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs">
              <button
                type="button"
                onClick={selectAllVendors}
                className="text-brand hover:underline font-medium"
              >
                Select Filtered
              </button>
              <span className="text-muted">|</span>
              <button
                type="button"
                onClick={deselectAllVendors}
                className="text-secondary hover:text-primary transition-colors"
              >
                Deselect Filtered
              </button>
            </div>
          </div>

          {/* Vendors Grid */}
          {isLoadingVendors ? (
            <div className="p-8 text-center text-sm text-secondary">
              Loading active vendor registry...
            </div>
          ) : availableVendors.length === 0 ? (
            <div className="p-8 text-center text-sm text-secondary bg-surface-2/30 rounded-lg border border-dashed border-border-default">
              No active vendors found matching your filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto p-1">
              {availableVendors.map((vendor: any) => {
                const isSelected = selectedVendorIds.includes(vendor.id);
                return (
                  <div
                    key={vendor.id}
                    onClick={() => toggleVendor(vendor.id)}
                    className={cn(
                      'p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 select-none',
                      isSelected
                        ? 'bg-brand/10 border-brand shadow-sm'
                        : 'bg-surface hover:bg-surface-2 border-border-default'
                    )}
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rounded border mt-0.5 flex items-center justify-center shrink-0 transition-colors',
                        isSelected
                          ? 'bg-brand border-brand text-white'
                          : 'border-border-default bg-surface'
                      )}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-medium text-primary truncate">
                          {vendor.name}
                        </span>
                        {vendor.rating && (
                          <span className="flex items-center gap-0.5 text-xs text-amber-400 font-medium shrink-0">
                            <Star className="w-3 h-3 fill-amber-400" />
                            {vendor.rating}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-surface-2 text-secondary font-mono">
                          {vendor.category}
                        </span>
                        <span className="text-[11px] text-muted truncate">
                          {vendor.contactName}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border-default">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/rfqs')}
            className="text-secondary hover:text-primary"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSubmit(false)}
              isLoading={saveMutation.isPending && !saveMutation.variables?.publish}
              disabled={saveMutation.isPending}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              Save as Draft
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => handleSubmit(true)}
              isLoading={saveMutation.isPending && saveMutation.variables?.publish}
              disabled={saveMutation.isPending}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              Publish RFQ
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
