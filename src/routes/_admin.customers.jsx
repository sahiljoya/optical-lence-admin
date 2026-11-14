import { createFileRoute } from "@tanstack/react-router";
import { Customers } from "@/pages/customers/Customers";
import { requirePermission } from "@/lib/permissions";

export const Route = createFileRoute("/_admin/customers")({
  beforeLoad: requirePermission("VIEW_CUSTOMERS"),
  head: () => ({
    meta: [
      { title: "Customers — VOC ERP" },
      { name: "description", content: "Manage B2B retailers, pricing tiers, and credit limits." },
    ]
  }),
  component: Customers,
});
