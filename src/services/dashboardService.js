import { makeRequestAuth } from "@/config/apiClient";

export const dashboardService = {
  getStats: () => makeRequestAuth("get", "/admin/dashboard/stats"),
  getRevenueOrdersByDay: (month, year) =>
    makeRequestAuth("get", "/admin/dashboard/revenue-orders-by-day", { month, year }),
};
