import { createFileRoute } from '@tanstack/react-router';
import { CustomerReport } from '../pages/reports/CustomerReport.jsx';

export const Route = createFileRoute('/_admin/reports/$customerId')({
  component: CustomerReport,
});
