import { createFileRoute } from "@tanstack/react-router";
import { Alerts } from "../pages/purchasing/Alerts.jsx";
import { requirePermission } from "@/lib/permissions";

export const Route = createFileRoute("/_admin/purchasing/alerts")({
  beforeLoad: requirePermission("VIEW_PURCHASING", "/purchasing"),
  component: Alerts,
});
