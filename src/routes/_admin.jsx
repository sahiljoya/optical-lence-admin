import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminLayout } from "../components/layout/AdminLayout";
import { getItem } from "../services/storage";

export const Route = createFileRoute("/_admin")({
  // Auth lives in sessionStorage, which the server can't read. Rendering this
  // subtree client-only means the beforeLoad guard below always runs before
  // the dashboard is shown, instead of being skipped during SSR.
  ssr: false,
  beforeLoad: () => {
    if (typeof window === "undefined") {
      return;
    }

    const token = getItem("admin_token");
    if (!token) {
      throw redirect({
        to: "/login",
      });
    }
  },
  component: AdminLayout,
});
