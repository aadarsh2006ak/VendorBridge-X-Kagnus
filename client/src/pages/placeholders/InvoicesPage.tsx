import React from 'react';
import { Receipt } from 'lucide-react';
import { ComingSoon } from './ComingSoon';

export function InvoicesPage() {
  return (
    <ComingSoon
      moduleName="Invoices & Payments"
      targetWeek="Week 4"
      description="Vendor billing verification, 3-way matching, and settlement records."
      icon={Receipt}
      features={[
        'Invoice upload & digital receipt capture',
        'PO-to-Invoice reconciliation check',
        'Payment terms & due date alerts',
        'Tax deduction (TDS) & GST breakdown',
      ]}
    />
  );
}

export default InvoicesPage;
