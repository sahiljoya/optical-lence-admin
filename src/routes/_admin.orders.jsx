import { createFileRoute } from "@tanstack/react-router";
import { Orders } from "../pages/orders/Orders";

export const Route = createFileRoute("/_admin/orders")({
  component: Orders,
});
