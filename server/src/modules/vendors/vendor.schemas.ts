import { z } from 'zod';
import { VendorStatus } from '@prisma/client';

export const gstRegex = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const phoneRegex = /^[+]?[\d\s-]{10,15}$/;

export const VENDOR_CATEGORIES = [
  'IT Hardware',
  'IT Services',
  'Furniture',
  'Stationery',
  'Logistics',
  'Construction',
  'Other',
] as const;

export const createVendorSchema = z
  .object({
    name: z
      .string({ required_error: 'Vendor name is required' })
      .trim()
      .min(2, 'Vendor name must be at least 2 characters')
      .max(120, 'Vendor name cannot exceed 120 characters'),
    category: z.enum(VENDOR_CATEGORIES, {
      errorMap: () => ({
        message: `Category must be one of: ${VENDOR_CATEGORIES.join(', ')}`,
      }),
    }),
    gstNumber: z
      .string({ required_error: 'GST number is required' })
      .trim()
      .toUpperCase()
      .regex(gstRegex, 'Invalid Indian GSTIN format (e.g. 27AABCS1429B1Z0)'),
    contactName: z
      .string({ required_error: 'Contact person name is required' })
      .trim()
      .min(2, 'Contact person name must be at least 2 characters')
      .max(80, 'Contact person name cannot exceed 80 characters'),
    contactEmail: z
      .string({ required_error: 'Contact email is required' })
      .trim()
      .email('Invalid contact email address')
      .toLowerCase(),
    contactPhone: z
      .string({ required_error: 'Contact phone number is required' })
      .trim()
      .regex(phoneRegex, 'Invalid phone number (minimum 10 digits)'),
    address: z.string().trim().max(300, 'Address cannot exceed 300 characters').optional().nullable(),
    notes: z.string().trim().max(500, 'Notes cannot exceed 500 characters').optional().nullable(),
    status: z.nativeEnum(VendorStatus).default(VendorStatus.PENDING),
  })
  .strict();

export const updateVendorSchema = createVendorSchema.partial().strict();

export const vendorQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.nativeEnum(VendorStatus).optional(),
  category: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['name', 'createdAt', 'status']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
export type VendorQueryInput = z.infer<typeof vendorQuerySchema>;
