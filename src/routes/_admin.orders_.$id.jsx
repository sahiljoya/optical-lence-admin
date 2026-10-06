import { createFileRoute } from "@tanstack/react-router";
import { OrderDetails } from "../pages/orders/OrderDetails";

export const Route = createFileRoute("/_admin/orders_/$id")({
  component: OrderDetails,
});
