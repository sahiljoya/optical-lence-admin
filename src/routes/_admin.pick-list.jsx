import { createFileRoute } from '@tanstack/react-router';
import { PickList } from '../pages/warehouse/PickList.jsx';

export const Route = createFileRoute('/_admin/pick-list')({
  component: PickList,
});
