import { createFileRoute } from '@tanstack/react-router';
import { FindMyLens } from '../pages/products/FindMyLens.jsx';

export const Route = createFileRoute('/_admin/find-my-lens')({
  component: FindMyLens,
});
