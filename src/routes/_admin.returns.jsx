import { createFileRoute } from '@tanstack/react-router';
import { Returns } from '../pages/returns/Returns.jsx';

export const Route = createFileRoute('/_admin/returns')({
  component: Returns,
});
