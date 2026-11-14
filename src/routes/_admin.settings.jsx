import { createFileRoute } from '@tanstack/react-router';
import { Settings } from '../pages/settings/Settings.jsx';
import { requirePermission } from '@/lib/permissions';

export const Route = createFileRoute('/_admin/settings')({
  beforeLoad: requirePermission(['MANAGE_USERS', 'MANAGE_ROLES']),
  component: Settings,
});
