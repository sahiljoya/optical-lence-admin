import { createFileRoute } from "@tanstack/react-router";
import { ProductMasters } from "../pages/purchasing/ProductMasters.jsx";
import { requirePermission } from "@/lib/permissions";

export const Route = createFileRoute("/_admin/purchasing/product-masters/")({
  beforeLoad: requirePermission("VIEW_PURCHASING"),
  component: ProductMasters,
});
