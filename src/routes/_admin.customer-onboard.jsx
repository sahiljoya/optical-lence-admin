import { createFileRoute } from "@tanstack/react-router";
import { CustomerOnboard } from "@/pages/customers/CustomerOnboard";
import { requirePermission } from "@/lib/permissions";

export const Route = createFileRoute("/_admin/customer-onboard")({
  beforeLoad: requirePermission("CREATE_CUSTOMER"),
  head: () => ({
    meta: [
      { title: "Onboard Customer — VOC ERP" },
    ]
  }),
  component: CustomerOnboard,
});
