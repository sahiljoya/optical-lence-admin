import { createFileRoute } from "@tanstack/react-router";
import { PurchaseOrderDetails } from "../pages/purchasing/PurchaseOrderDetails.jsx";
import { requirePermission } from "@/lib/permissions";

export const Route = createFileRoute("/_admin/purchasing/orders/$id")({
  beforeLoad: requirePermission(["VIEW_PURCHASE_ORDERS", "VIEW_PURCHASING"]),
  component: PurchaseOrderDetails,
});
