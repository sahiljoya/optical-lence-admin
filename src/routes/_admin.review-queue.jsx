import { createFileRoute } from "@tanstack/react-router";
import { ReviewQueue } from "@/pages/customers/ReviewQueue";
import { requirePermission } from "@/lib/permissions";

export const Route = createFileRoute("/_admin/review-queue")({
  beforeLoad: requirePermission("APPROVE_CUSTOMER"),
  head: () => ({
    meta: [
      { title: "Review Queue — VOC ERP" },
    ]
  }),
  component: ReviewQueue,
});
