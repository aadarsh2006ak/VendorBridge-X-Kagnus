import React from 'react';
import { Activity } from 'lucide-react';
import { ComingSoon } from './ComingSoon';

export function ActivityPage() {
  return (
    <ComingSoon
      moduleName="Activity & Audit Logs"
      targetWeek="Week 4"
      description="Immutable forensic audit trail of all authentication and procurement events."
      icon={Activity}
      features={[
        'Timestamped procurement audit timeline',
        'Actor avatars and role attribution',
        'Deep entity inspection (User, Vendor, PO)',
        'Compliance export for forensic verification',
      ]}
    />
  );
}

export default ActivityPage;
