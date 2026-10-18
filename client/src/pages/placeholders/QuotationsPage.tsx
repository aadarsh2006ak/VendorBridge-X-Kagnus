import React from 'react';
import { Layers } from 'lucide-react';
import { ComingSoon } from './ComingSoon';

export function QuotationsPage() {
  return (
    <ComingSoon
      moduleName="Vendor Quotations"
      targetWeek="Week 2 & 3"
      description="Supplier bid submissions and side-by-side comparison matrix."
      icon={Layers}
      features={[
        'Supplier quotation submission portal',
        'Unit cost, tax, & lead-time breakdowns',
        'Automated lowest-bid highlighter',
        'Comparative matrix and margin analysis',
      ]}
    />
  );
}

export default QuotationsPage;
