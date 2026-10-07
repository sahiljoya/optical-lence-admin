import { createFileRoute } from '@tanstack/react-router';
import { Reports } from '../pages/reports/Reports.jsx';

export const Route = createFileRoute('/_admin/reports/')({
  component: Reports,
});
