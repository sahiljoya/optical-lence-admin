import { createFileRoute } from '@tanstack/react-router';
import { EditProduct } from '../pages/products/EditProduct.jsx';

export const Route = createFileRoute('/_admin/products_/$id_/edit')({
  component: EditProduct,
});
