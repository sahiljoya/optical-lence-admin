import { createFileRoute } from '@tanstack/react-router';
import { Dispatch } from '../pages/dispatch/Dispatch.jsx';
import { requirePermission } from '@/lib/permissions';

export const Route = createFileRoute('/_admin/dispatch')({
  beforeLoad: requirePermission('MANAGE_DISPATCH'),
  component: Dispatch,
});
