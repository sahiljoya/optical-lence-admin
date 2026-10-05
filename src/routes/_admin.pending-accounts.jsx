import { createFileRoute } from "@tanstack/react-router";
import { PendingAccounts } from "@/pages/customers/PendingAccounts";

export const Route = createFileRoute("/_admin/pending-accounts")({
  head: () => ({
    meta: [
      { title: "Pending Accounts — VOC ERP" },
    ]
  }),
  component: PendingAccounts,
});
