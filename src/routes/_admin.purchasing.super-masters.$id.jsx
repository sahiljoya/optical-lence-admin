import { createFileRoute } from "@tanstack/react-router";
import { SuperMasterView } from "../pages/purchasing/SuperMasterView.jsx";
import { requirePermission } from "@/lib/permissions";

export const Route = createFileRoute("/_admin/purchasing/super-masters/$id")({
  beforeLoad: requirePermission("VIEW_PURCHASING"),
  component: SuperMasterView,
});
