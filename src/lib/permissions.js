import { getItem } from "@/services/storage";

// Returns true if the logged-in staff member's role includes this permission.
// Super admins with role name "admin" implicitly pass everything (defense in
// depth — the real gate is server-side; this only controls what the UI shows).
export function hasPermission(permission) {
  try {
    const user = getItem("admin_user");
    const permissions = user?.role?.permissions || [];
    return permissions.includes(permission);
  } catch {
    return false;
  }
}
