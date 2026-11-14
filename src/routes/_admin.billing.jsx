import { createFileRoute } from '@tanstack/react-router';
import { Billing } from '../pages/billing/Billing.jsx';
import { requirePermission } from '@/lib/permissions';

export const Route = createFileRoute('/_admin/billing')({
  beforeLoad: requirePermission('VIEW_BILLING'),
  component: Billing,
});
