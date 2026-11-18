import { createFileRoute } from "@tanstack/react-router";
import { SuppliersSettings } from "../pages/purchasing/SuppliersSettings.jsx";
import { requirePermission } from "@/lib/permissions";

export const Route = createFileRoute("/_admin/purchasing/suppliers")({
  beforeLoad: requirePermission("VIEW_PURCHASING"),
  component: SuppliersSettings,
});
