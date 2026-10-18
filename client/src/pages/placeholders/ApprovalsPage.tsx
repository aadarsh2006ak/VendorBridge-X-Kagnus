import React from 'react';
import { CheckSquare } from 'lucide-react';
import { ComingSoon } from './ComingSoon';

export function ApprovalsPage() {
  return (
    <ComingSoon
      moduleName="Procurement Approvals"
      targetWeek="Week 3"
      description="Multi-tier managerial authorization workflow and financial compliance."
      icon={CheckSquare}
      features={[
        '4-stage decision lifecycle tracker',
        'Budget threshold approvals',
        'One-click approval / rejection with comments',
        'Audit trail of manager authorizations',
      ]}
    />
  );
}

export default ApprovalsPage;
