import { createFileRoute } from "@tanstack/react-router";
import { PurchasingHome } from "../pages/purchasing/Home.jsx";
import { requirePermission } from "@/lib/permissions";

export const Route = createFileRoute("/_admin/purchasing/")({
  beforeLoad: requirePermission("VIEW_PURCHASING", "/purchasing/orders"),
  component: PurchasingHome,
});
