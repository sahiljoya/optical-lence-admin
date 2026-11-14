import { createFileRoute } from '@tanstack/react-router';
import { Replenishment } from '../pages/warehouse/Replenishment.jsx';
import { requirePermission } from '@/lib/permissions';

export const Route = createFileRoute('/_admin/replenishment')({
  beforeLoad: requirePermission('VIEW_INVENTORY'),
  component: Replenishment,
});
