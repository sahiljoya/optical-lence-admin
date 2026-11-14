import { createFileRoute } from '@tanstack/react-router';
import { Returns } from '../pages/returns/Returns.jsx';
import { requirePermission } from '@/lib/permissions';

export const Route = createFileRoute('/_admin/returns')({
  beforeLoad: requirePermission('VIEW_RETURNS'),
  component: Returns,
});
