import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { ComingSoon } from './ComingSoon';

export function PurchaseOrdersPage() {
  return (
    <ComingSoon
      moduleName="Purchase Orders"
      targetWeek="Week 4"
      description="Automated PO generation upon approval with exportable PDF documents."
      icon={ShoppingBag}
      features={[
        'Automated PO number sequencing',
        'Line-item purchase orders with tax computation',
        'Downloadable & printable official PO PDFs',
        'Fulfillment tracking and status transitions',
      ]}
    />
  );
}

export default PurchaseOrdersPage;
