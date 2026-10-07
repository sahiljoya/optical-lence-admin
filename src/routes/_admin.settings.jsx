import { createFileRoute } from '@tanstack/react-router';
import { Settings } from '../pages/settings/Settings.jsx';

export const Route = createFileRoute('/_admin/settings')({
  component: Settings,
});
