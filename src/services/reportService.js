import { makeRequestAuth } from "@/config/apiClient";

export const reportService = {
  getKPIs: (dateRange) => makeRequestAuth("get", "/admin/reports/kpis", { dateRange }),
  getRevenueVsCollections: (months) => makeRequestAuth("get", "/admin/reports/revenue-collections", { months }),
  getFastMovingLenses: () => makeRequestAuth("get", "/admin/reports/fast-moving-lenses"),
  getKhataStatusBreakdown: () => makeRequestAuth("get", "/admin/reports/khata-status"),
  getCustomerAnalytics: (params = {}) => makeRequestAuth("post", "/admin/reports/customer-analytics", params),
  getCustomerReportDetail: (customerId) => makeRequestAuth("get", `/admin/reports/customer/${customerId}`),
};
