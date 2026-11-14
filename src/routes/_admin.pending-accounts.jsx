import { createFileRoute } from "@tanstack/react-router";
import { PendingAccounts } from "@/pages/customers/PendingAccounts";
import { requirePermission } from "@/lib/permissions";

export const Route = createFileRoute("/_admin/pending-accounts")({
  beforeLoad: requirePermission("APPROVE_CUSTOMER"),
  head: () => ({
    meta: [
      { title: "Pending Accounts — VOC ERP" },
    ]
  }),
  component: PendingAccounts,
});
