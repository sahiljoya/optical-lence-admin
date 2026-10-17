import { createFileRoute } from "@tanstack/react-router";
import { Logs } from "@/pages/logs/Logs";

export const Route = createFileRoute("/_admin/logs")({
  head: () => ({
    meta: [
      { title: "Activity Logs — VOC ERP" },
    ]
  }),
  component: Logs,
});
