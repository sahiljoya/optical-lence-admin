import { createFileRoute } from "@tanstack/react-router";
import { CourierReconciliation } from "../pages/dispatch/CourierReconciliation.jsx";

export const Route = createFileRoute("/_admin/courier-reconciliation")({
  component: CourierReconciliation,
});
