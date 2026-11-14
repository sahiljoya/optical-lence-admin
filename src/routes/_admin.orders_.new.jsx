import { createFileRoute } from '@tanstack/react-router';
import { CreateOrder } from '../pages/orders/CreateOrder.jsx';
import { requirePermission } from '@/lib/permissions';

export const Route = createFileRoute('/_admin/orders_/new')({
  beforeLoad: requirePermission('PLACE_ORDER'),
  component: CreateOrder,
});
