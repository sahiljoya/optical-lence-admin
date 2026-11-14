import { createFileRoute } from '@tanstack/react-router';
import { Products } from '../pages/products/Products.jsx';
import { requirePermission } from '@/lib/permissions';

export const Route = createFileRoute('/_admin/products')({
  beforeLoad: requirePermission('VIEW_PRODUCTS'),
  component: Products,
});
