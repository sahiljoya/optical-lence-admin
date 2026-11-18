import { createFileRoute } from "@tanstack/react-router";
import { NewOrder } from "../pages/purchasing/NewOrder.jsx";
import { requirePermission } from "@/lib/permissions";

export const Route = createFileRoute("/_admin/purchasing/orders/new")({
  beforeLoad: requirePermission("VIEW_PURCHASING", "/purchasing"),
  validateSearch: (search) => (search.pm ? { pm: String(search.pm) } : {}),
  component: NewOrder,
});
