import { createFileRoute } from '@tanstack/react-router'
import { Support } from '../pages/support/Support'

export const Route = createFileRoute('/_admin/support')({
  component: Support,
})
