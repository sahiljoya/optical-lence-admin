import { createFileRoute } from '@tanstack/react-router'
import { Support } from '../pages/support/Support'
import { requirePermission } from '@/lib/permissions'

export const Route = createFileRoute('/_admin/support')({
  beforeLoad: requirePermission('MANAGE_SUPPORT'),
  component: Support,
})
