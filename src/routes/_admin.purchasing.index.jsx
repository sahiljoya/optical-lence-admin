import { createFileRoute } from "@tanstack/react-router";
import { SuperMasters } from "../pages/purchasing/SuperMasters.jsx";
import { requirePermission } from "@/lib/permissions";

export const Route = createFileRoute("/_admin/purchasing/")({
  beforeLoad: requirePermission("VIEW_PURCHASING", "/purchasing/orders"),
  component: SuperMasters,
});
