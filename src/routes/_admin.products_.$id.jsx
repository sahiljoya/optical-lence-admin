import { createFileRoute } from '@tanstack/react-router';
import { ProductMatrix } from '../pages/products/ProductMatrix.jsx';

export const Route = createFileRoute('/_admin/products_/$id')({
  component: ProductMatrix,
});
