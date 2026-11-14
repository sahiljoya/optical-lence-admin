import { redirect } from "@tanstack/react-router";
import { getItem } from "@/services/storage";

// Returns true if the logged-in staff member's role includes this permission.
// Super admins with role name "admin" implicitly pass everything (defense in
// depth — the real gate is server-side; this only controls what the UI shows).
export function hasPermission(permission) {
  try {
    const user = getItem("admin_user");
    if (user?.role?.name === "admin" || user?.role === "admin") return true;
    const permissions = user?.role?.permissions || [];
    if (Array.isArray(permission)) {
      return permission.some((p) => permissions.includes(p));
    }
    return permissions.includes(permission);
  } catch {
    return false;
  }
}

// Route guard helper for TanStack Router `beforeLoad`.
// Redirects unauthorized users to the dashboard or login.
export function requirePermission(permission, redirectTo = "/") {
  return () => {
    if (typeof window === "undefined") return;
    if (!hasPermission(permission)) {
      throw redirect({ to: redirectTo });
    }
  };
}

export function requireOwnerAdmin(redirectTo = "/") {
  return () => {
    if (typeof window === "undefined") return;
    const user = getItem("admin_user");
    if (user?.role?.name !== "admin" && user?.role !== "admin") {
      throw redirect({ to: redirectTo });
    }
  };
}
