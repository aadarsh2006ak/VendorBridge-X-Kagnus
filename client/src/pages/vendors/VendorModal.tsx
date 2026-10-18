import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '../../lib/api';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';

const gstRegex = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const phoneRegex = /^[+]?[\d\s-]{10,15}$/;

const VENDOR_CATEGORIES = [
  'IT Hardware',
  'IT Services',
  'Furniture',
  'Stationery',
  'Logistics',
  'Construction',
  'Other',
] as const;

const vendorFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Vendor name must be at least 2 characters')
    .max(120, 'Vendor name cannot exceed 120 characters'),
  category: z.enum(VENDOR_CATEGORIES, {
    errorMap: () => ({ message: 'Please select a valid vendor category' }),
  }),
  gstNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(gstRegex, 'Invalid 15-character Indian GST format (e.g. 27AABCS1429B1Z0)'),
  contactName: z
    .string()
    .trim()
    .min(2, 'Contact person name must be at least 2 characters')
    .max(80, 'Contact person name cannot exceed 80 characters'),
  contactEmail: z.string().trim().email('Invalid email address').toLowerCase(),
  contactPhone: z
    .string()
    .trim()
    .regex(phoneRegex, 'Invalid phone number format (min 10 digits)'),
  address: z.string().trim().max(300, 'Address cannot exceed 300 characters').optional().nullable(),
  notes: z.string().trim().max(500, 'Notes cannot exceed 500 characters').optional().nullable(),
  status: z.enum(['ACTIVE', 'PENDING', 'BLOCKED']),
});

export type VendorFormData = z.infer<typeof vendorFormSchema>;

interface VendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorToEdit?: any | null;
}

export function VendorModal({ isOpen, onClose, vendorToEdit }: VendorModalProps) {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const isEditing = !!vendorToEdit;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VendorFormData>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      name: '',
      category: 'IT Hardware',
      gstNumber: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      address: '',
      notes: '',
      status: 'PENDING',
    },
  });

  useEffect(() => {
    if (vendorToEdit) {
      reset({
        name: vendorToEdit.name,
        category: vendorToEdit.category,
        gstNumber: vendorToEdit.gstNumber,
        contactName: vendorToEdit.contactName,
        contactEmail: vendorToEdit.contactEmail,
        contactPhone: vendorToEdit.contactPhone,
        address: vendorToEdit.address || '',
        notes: vendorToEdit.notes || '',
        status: vendorToEdit.status,
      });
    } else {
      reset({
        name: '',
        category: 'IT Hardware',
        gstNumber: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        address: '',
        notes: '',
        status: 'PENDING',
      });
    }
  }, [vendorToEdit, reset, isOpen]);

  const mutation = useMutation({
    mutationFn: async (data: VendorFormData) => {
      if (isEditing) {
        const res = await api.patch(`/vendors/${vendorToEdit.id}`, data);
        return res.data;
      } else {
        const res = await api.post('/vendors', data);
        return res.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', vendorToEdit?.id] });
      success(
        isEditing ? 'Vendor Updated' : 'Vendor Registered',
        `Successfully saved supplier profile.`
      );
      onClose();
    },
    onError: (err: any) => {
      const msg = getErrorMessage(err);
      if (err.response?.status === 409) {
        setError('gstNumber', {
          type: 'manual',
          message: 'A vendor with this GST Number already exists.',
        });
      } else {
        toastError('Failed to save vendor', msg);
      }
    },
  });

  const onSubmit = (data: VendorFormData) => {
    mutation.mutate(data);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Vendor Profile' : 'Register New Vendor'}
      subtitle={
        isEditing
          ? `Update details for ${vendorToEdit.name}`
          : 'Add a new supplier to the persistent database'
      }
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Row 1: Vendor Name & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="modal-vendor-name"
            label="Vendor / Business Name"
            placeholder="e.g. Acme Supplies Pvt Ltd"
            required
            error={errors.name?.message}
            {...register('name')}
          />

          <Select
            id="modal-vendor-category"
            label="Category"
            required
            error={errors.category?.message}
            options={VENDOR_CATEGORIES.map((c) => ({ label: c, value: c }))}
            {...register('category')}
          />
        </div>

        {/* Row 2: GST Number & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="modal-vendor-gst"
            label="GSTIN Number (15 Characters)"
            placeholder="27AABCS1429B1Z0"
            required
            className="font-mono uppercase"
            error={errors.gstNumber?.message}
            {...register('gstNumber')}
          />

          <Select
            id="modal-vendor-status"
            label="Status"
            required
            error={errors.status?.message}
            options={[
              { label: 'Active', value: 'ACTIVE' },
              { label: 'Pending', value: 'PENDING' },
              { label: 'Blocked', value: 'BLOCKED' },
            ]}
            {...register('status')}
          />
        </div>

        {/* Row 3: Contact Person & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="modal-vendor-contact-name"
            label="Contact Person Name"
            placeholder="e.g. Anita Sharma"
            required
            error={errors.contactName?.message}
            {...register('contactName')}
          />

          <Input
            id="modal-vendor-contact-email"
            label="Contact Email"
            type="email"
            placeholder="contact@supplier.com"
            required
            error={errors.contactEmail?.message}
            {...register('contactEmail')}
          />
        </div>

        {/* Row 4: Contact Phone Number */}
        <Input
          id="modal-vendor-contact-phone"
          label="Contact Phone Number"
          placeholder="+91 98765 43210"
          required
          error={errors.contactPhone?.message}
          {...register('contactPhone')}
        />

        {/* Row 5: Address */}
        <Textarea
          id="modal-vendor-address"
          label="Registered Business Address (Optional)"
          placeholder="Plot / Street / City / State / PIN Code"
          rows={2}
          error={errors.address?.message}
          {...register('address')}
        />

        {/* Row 6: Notes */}
        <Textarea
          id="modal-vendor-notes"
          label="Internal Notes / Specializations (Optional)"
          placeholder="Payment terms, delivery capabilities, remarks"
          rows={2}
          error={errors.notes?.message}
          {...register('notes')}
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-default">
          <Button type="button" variant="outline" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting || mutation.isPending}
          >
            {isEditing ? 'Save Changes' : 'Create Vendor'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default VendorModal;
