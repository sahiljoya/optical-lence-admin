import { removeItem } from "@/services/storage";

export function logout() {
  removeItem("admin_user");
  removeItem("admin_token");
}

export function onErrorLogout() {
  logout();
  window.location.href = "/login";
}

export function handleResponse(data) {
  if (!data) {
    throw new Error("No response data received");
  }

  if (data.error) {
    if (data.code === 3) {
      onErrorLogout();
    }
    if (data.code === 401) {
      onErrorLogout();
    }
    const err = new Error(data.message || "An error occurred");
    err.data = data.data;
    err.code = data.code;
    throw err;
  }

  return data;
}
