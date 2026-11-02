import { createFileRoute } from '@tanstack/react-router';
import { AgingStock } from '../pages/products/AgingStock.jsx';

export const Route = createFileRoute('/_admin/aging-stock')({
  component: AgingStock,
});

