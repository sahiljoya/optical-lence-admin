import { createFileRoute } from "@tanstack/react-router";
import { CustomerOnboard } from "@/pages/customers/CustomerOnboard";

export const Route = createFileRoute("/_admin/customer-onboard")({
  head: () => ({
    meta: [
      { title: "Onboard Customer — VOC ERP" },
    ]
  }),
  component: CustomerOnboard,
});
