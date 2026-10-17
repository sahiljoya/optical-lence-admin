import { makeRequestAuth } from "@/config/apiClient";

export const settingsService = {
  getPlatformSettings: () => makeRequestAuth("get", "/admin/settings/platform"),
  updatePlatformSettings: (data) => makeRequestAuth("post", "/admin/settings/platform", data),
};
