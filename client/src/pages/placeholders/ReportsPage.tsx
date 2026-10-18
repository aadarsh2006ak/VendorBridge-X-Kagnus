import React from 'react';
import { BarChart3 } from 'lucide-react';
import { ComingSoon } from './ComingSoon';

export function ReportsPage() {
  return (
    <ComingSoon
      moduleName="Reports & Analytics"
      targetWeek="Week 4"
      description="Spend analytics, category expenditures, and supplier KPI scorecards."
      icon={BarChart3}
      features={[
        'Monthly & quarterly expenditure histograms',
        'Top 5 vendor spend allocation charts',
        'Category-wise budget utilization breakdown',
        'CSV/Excel procurement report export',
      ]}
    />
  );
}

export default ReportsPage;
