import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/pages/dashboard/Dashboard";

export const Route = createFileRoute("/_admin/")({
  component: Dashboard,
});
