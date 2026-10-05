import { createFileRoute } from "@tanstack/react-router";
import { Customers } from "@/pages/customers/Customers";

export const Route = createFileRoute("/_admin/customers")({
  head: () => ({
    meta: [
      { title: "Customers — VOC ERP" },
      { name: "description", content: "Manage B2B retailers, pricing tiers, and credit limits." },
    ]
  }),
  component: Customers,
});
