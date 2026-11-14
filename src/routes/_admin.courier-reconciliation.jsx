import { createFileRoute } from "@tanstack/react-router";
import { CourierReconciliation } from "../pages/dispatch/CourierReconciliation.jsx";
import { requirePermission } from "@/lib/permissions";

export const Route = createFileRoute("/_admin/courier-reconciliation")({
  beforeLoad: requirePermission("MANAGE_COURIER_BILLING"),
  component: CourierReconciliation,
});
