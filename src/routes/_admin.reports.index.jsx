import { createFileRoute } from '@tanstack/react-router';
import { Reports } from '../pages/reports/Reports.jsx';
import { requirePermission } from '@/lib/permissions';

export const Route = createFileRoute('/_admin/reports/')({
  beforeLoad: requirePermission('VIEW_REPORTS'),
  component: Reports,
});
