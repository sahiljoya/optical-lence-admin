import { createFileRoute } from "@tanstack/react-router";
import { ReviewQueue } from "@/pages/customers/ReviewQueue";

export const Route = createFileRoute("/_admin/review-queue")({
  head: () => ({
    meta: [
      { title: "Review Queue — VOC ERP" },
    ]
  }),
  component: ReviewQueue,
});
