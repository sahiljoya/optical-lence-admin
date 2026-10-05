import { createFileRoute } from "@tanstack/react-router";
import { CustomerDetails } from "@/pages/customers/CustomerDetails";

export const Route = createFileRoute("/_admin/customer/$id")({
  head: () => ({
    meta: [
      { title: "Customer Details — VOC ERP" },
    ]
  }),
  component: CustomerDetails,
});
