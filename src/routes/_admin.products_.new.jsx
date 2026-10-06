import { createFileRoute } from '@tanstack/react-router';
import { CreateProduct } from '../pages/products/CreateProduct.jsx';

export const Route = createFileRoute('/_admin/products_/new')({
  component: CreateProduct,
});
