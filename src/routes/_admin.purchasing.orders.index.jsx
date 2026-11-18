import { createFileRoute } from "@tanstack/react-router";
import { PurchaseOrders } from "../pages/purchasing/PurchaseOrders.jsx";
import { requirePermission } from "@/lib/permissions";

export const Route = createFileRoute("/_admin/purchasing/orders/")({
  beforeLoad: requirePermission(["VIEW_PURCHASE_ORDERS", "VIEW_PURCHASING"]),
  component: PurchaseOrders,
});
