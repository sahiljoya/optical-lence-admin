import { makeRequestAuth } from "@/config/apiClient";

export const notificationService = {
  getNotifications: (params = {}) => makeRequestAuth("get", "/admin/notifications/list", params),
  getUnreadCount: () => makeRequestAuth("get", "/admin/notifications/unread-count"),
  markAsRead: (id) => makeRequestAuth("patch", `/admin/notifications/${id}/read`),
  markAllAsRead: () => makeRequestAuth("patch", "/admin/notifications/read-all"),
};
