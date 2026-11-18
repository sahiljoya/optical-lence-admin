import { createFileRoute } from "@tanstack/react-router";
import { CreateProductMaster } from "../pages/purchasing/CreateProductMaster.jsx";
import { requirePermission } from "@/lib/permissions";

export const Route = createFileRoute("/_admin/purchasing/product-masters/new")({
  beforeLoad: requirePermission("MANAGE_PURCHASING", "/purchasing"),
  validateSearch: (search) => (search.sm ? { sm: String(search.sm) } : {}),
  component: CreateProductMaster,
});
