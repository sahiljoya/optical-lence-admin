import { createFileRoute } from '@tanstack/react-router';
import { CreateProduct } from '../pages/products/CreateProduct.jsx';
import { requirePermission } from '@/lib/permissions';

export const Route = createFileRoute('/_admin/products_/new')({
  beforeLoad: requirePermission('MANAGE_PRODUCTS'),
  component: CreateProduct,
});
