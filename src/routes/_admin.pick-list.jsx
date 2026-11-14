import { createFileRoute } from '@tanstack/react-router';
import { PickList } from '../pages/warehouse/PickList.jsx';
import { requirePermission } from '@/lib/permissions';

export const Route = createFileRoute('/_admin/pick-list')({
  beforeLoad: requirePermission('MANAGE_DISPATCH'),
  component: PickList,
});
