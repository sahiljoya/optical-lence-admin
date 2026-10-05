import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminLayout } from "../components/layout/AdminLayout";

export const Route = createFileRoute("/_admin")({
  beforeLoad: () => {
    if (typeof window === "undefined") {
      // We are on the server (SSR). Skip the auth redirect here because we can't access localStorage.
      return;
    }

    const token = localStorage.getItem("TEMP_DEV_AUTH_TOKEN");
    if (!token) {
      throw redirect({
        to: "/login",
      });
    }
  },
  component: AdminLayout,
});
