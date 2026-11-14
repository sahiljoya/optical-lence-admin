import { createFileRoute } from '@tanstack/react-router';
import { FindMyLens } from '../pages/products/FindMyLens.jsx';
import { requirePermission } from '@/lib/permissions';

export const Route = createFileRoute('/_admin/find-my-lens')({
  beforeLoad: requirePermission('VIEW_INVENTORY'),
  component: FindMyLens,
});
