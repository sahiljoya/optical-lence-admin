import { createFileRoute } from "@tanstack/react-router";
import { Logs } from "@/pages/logs/Logs";
import { requireOwnerAdmin } from "@/lib/permissions";

export const Route = createFileRoute("/_admin/logs")({
  beforeLoad: requireOwnerAdmin(),
  head: () => ({
    meta: [
      { title: "Activity Logs — VOC ERP" },
    ]
  }),
  component: Logs,
});
