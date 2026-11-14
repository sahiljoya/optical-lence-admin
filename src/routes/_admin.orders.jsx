import { createFileRoute } from "@tanstack/react-router";
import { Orders } from "../pages/orders/Orders";
import { requirePermission } from "@/lib/permissions";

export const Route = createFileRoute("/_admin/orders")({
  beforeLoad: requirePermission("VIEW_ORDERS"),
  component: Orders,
});
