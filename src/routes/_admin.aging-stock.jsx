import { createFileRoute } from '@tanstack/react-router';
import { AgingStock } from '../pages/products/AgingStock.jsx';
import { requirePermission } from '@/lib/permissions';

export const Route = createFileRoute('/_admin/aging-stock')({
  beforeLoad: requirePermission(['VIEW_PRODUCTS', 'VIEW_INVENTORY']),
  component: AgingStock,
});

