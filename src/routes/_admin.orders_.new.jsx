import { createFileRoute } from '@tanstack/react-router';
import { CreateOrder } from '../pages/orders/CreateOrder.jsx';

export const Route = createFileRoute('/_admin/orders_/new')({
  component: CreateOrder,
});
