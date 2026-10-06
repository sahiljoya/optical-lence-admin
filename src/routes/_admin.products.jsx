import { createFileRoute } from '@tanstack/react-router';
import { Products } from '../pages/products/Products.jsx';

export const Route = createFileRoute('/_admin/products')({
  component: Products,
});
