import React from 'react';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  User,
  ShieldCheck,
  Edit,
} from 'lucide-react';
import { Drawer } from '../../components/ui/Drawer';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { formatDate } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

interface VendorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: any | null;
  onEdit: (vendor: any) => void;
}

export function VendorDrawer({ isOpen, onClose, vendor, onEdit }: VendorDrawerProps) {
  const { user } = useAuth();

  if (!vendor) return null;

  const canEdit = user?.role === 'ADMIN' || user?.role === 'PROCUREMENT_OFFICER';

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={vendor.name}
      subtitle={`Category: ${vendor.category}`}
      width="lg"
      footer={
        canEdit ? (
          <Button
            variant="primary"
            size="sm"
            className="gap-2"
            onClick={() => {
              onClose();
              onEdit(vendor);
            }}
          >
            <Edit className="w-4 h-4" />
            Edit Vendor Details
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-6 text-sm">
        {/* Status & GST Top Bar */}
        <div className="p-4 rounded-xl bg-surface-2 border border-border-default flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted block">
              GSTIN
            </span>
            <span className="font-mono text-sm font-bold text-primary tracking-wider">
              {vendor.gstNumber}
            </span>
          </div>
          <StatusBadge status={vendor.status} />
        </div>

        {/* Primary Contact Details */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-brand" />
            Primary Contact Person
          </h3>
          <div className="p-4 rounded-xl bg-surface-2/60 border border-border-default/70 space-y-2.5">
            <div className="text-base font-semibold text-primary">{vendor.contactName}</div>
            <div className="flex items-center gap-2 text-secondary text-xs">
              <Mail className="w-3.5 h-3.5 text-muted shrink-0" />
              <a href={`mailto:${vendor.contactEmail}`} className="hover:text-primary transition-colors">
                {vendor.contactEmail}
              </a>
            </div>
            <div className="flex items-center gap-2 text-secondary text-xs">
              <Phone className="w-3.5 h-3.5 text-muted shrink-0" />
              <a href={`tel:${vendor.contactPhone}`} className="hover:text-primary transition-colors">
                {vendor.contactPhone}
              </a>
            </div>
          </div>
        </div>

        {/* Registered Address */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-brand" />
            Registered Business Address
          </h3>
          <div className="p-4 rounded-xl bg-surface-2/60 border border-border-default/70 text-xs text-secondary leading-relaxed">
            {vendor.address || 'No registered business address provided.'}
          </div>
        </div>

        {/* Internal Notes */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-brand" />
            Internal Remarks & Specializations
          </h3>
          <div className="p-4 rounded-xl bg-surface-2/60 border border-border-default/70 text-xs text-secondary leading-relaxed italic">
            {vendor.notes || 'No special notes or instructions recorded.'}
          </div>
        </div>

        {/* System Metadata */}
        <div className="p-4 rounded-xl bg-surface-2/40 border border-border-default/50 space-y-2 text-xs text-muted">
          <div className="flex items-center justify-between">
            <span>Registered By:</span>
            <span className="text-secondary font-medium">
              {vendor.createdBy ? `${vendor.createdBy.firstName} ${vendor.createdBy.lastName}` : 'System Admin'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Date Added:</span>
            <span className="text-secondary">{formatDate(vendor.createdAt)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Last Updated:</span>
            <span className="text-secondary">{formatDate(vendor.updatedAt)}</span>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

export default VendorDrawer;
