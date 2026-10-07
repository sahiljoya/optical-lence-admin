import { createFileRoute } from '@tanstack/react-router';
import { Billing } from '../pages/billing/Billing.jsx';

export const Route = createFileRoute('/_admin/billing')({
  component: Billing,
});
