import { createFileRoute } from '@tanstack/react-router';
import { CustomerReport } from '../pages/reports/CustomerReport.jsx';
import { requirePermission } from '@/lib/permissions';

export const Route = createFileRoute('/_admin/reports/$customerId')({
  beforeLoad: requirePermission('VIEW_REPORTS'),
  component: CustomerReport,
});
