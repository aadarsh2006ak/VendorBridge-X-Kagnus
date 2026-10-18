import React from 'react';
import { FileText } from 'lucide-react';
import { ComingSoon } from './ComingSoon';

export function RfqsPage() {
  return (
    <ComingSoon
      moduleName="Requests for Quotations (RFQs)"
      targetWeek="Week 2"
      description="Create, publish, and manage multi-item RFQs for vendor bidding."
      icon={FileText}
      features={[
        '3-step RFQ creation wizard',
        'Line items specification with target pricing',
        'Direct dispatch to verified vendors',
        'Real-time bidding countdown & status tracking',
      ]}
    />
  );
}

export default RfqsPage;
