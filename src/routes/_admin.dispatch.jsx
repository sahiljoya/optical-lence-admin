import { createFileRoute } from '@tanstack/react-router';
import { Dispatch } from '../pages/dispatch/Dispatch.jsx';

export const Route = createFileRoute('/_admin/dispatch')({
  component: Dispatch,
});
