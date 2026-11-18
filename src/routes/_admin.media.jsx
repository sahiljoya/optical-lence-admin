import { createFileRoute } from '@tanstack/react-router';
import { Media } from '../pages/media/Media.jsx';
import { requirePermission } from '@/lib/permissions';

export const Route = createFileRoute('/_admin/media')({
  beforeLoad: requirePermission('VIEW_PRODUCTS'),
  component: Media,
});
