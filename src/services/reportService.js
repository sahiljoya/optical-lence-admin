import { makeRequestAuth } from "@/config/apiClient";

// entity: only for Shared (owner) logins — "Arsh Optical" / "Sunshine Optical", empty = both.
const withEntity = (params, entity) => (entity ? { ...params, entity } : params);

export const reportService = {
  getKPIs: (dateRange, entity) =>
    makeRequestAuth("get", "/admin/reports/kpis", withEntity({ dateRange }, entity)),
  getRevenueVsCollections: (months, entity) =>
    makeRequestAuth("get", "/admin/reports/revenue-collections", withEntity({ months }, entity)),
  // view: powers | sph_ranges | top_revenue | top_volume | attributes | customer_tier | city
  getFastMovingLenses: (view, dateRange, entity) =>
    makeRequestAuth(
      "get",
      "/admin/reports/fast-moving-lenses",
      withEntity({ view, dateRange }, entity),
    ),
  // view: status | ageing | overdue | credit | hold
  getKhataStatusBreakdown: (view, entity) =>
    makeRequestAuth("get", "/admin/reports/khata-status", withEntity({ view }, entity)),
  // params: search, page, limit, filter (all | dormant | near_limit | hold), entity
  getCustomerAnalytics: (params = {}) =>
    makeRequestAuth("post", "/admin/reports/customer-analytics", params),
  getCustomerReportDetail: (customerId) =>
    makeRequestAuth("get", `/admin/reports/customer/${customerId}`),
};
