import { createFileRoute } from "@tanstack/react-router";
import { ProductMasterView } from "../pages/purchasing/ProductMasterView.jsx";
import { requirePermission } from "@/lib/permissions";

export const Route = createFileRoute("/_admin/purchasing/product-masters/$id")({
  beforeLoad: requirePermission("VIEW_PURCHASING"),
  validateSearch: (search) => (search.view ? { view: String(search.view) } : {}),
  component: ProductMasterView,
});
