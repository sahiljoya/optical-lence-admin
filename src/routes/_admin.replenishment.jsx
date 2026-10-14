import { createFileRoute } from '@tanstack/react-router';
import { Replenishment } from '../pages/warehouse/Replenishment.jsx';

export const Route = createFileRoute('/_admin/replenishment')({
  component: Replenishment,
});
