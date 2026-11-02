import { makeRequestAuth } from "@/config/apiClient";

export const returnService = {
  getReturns: (params) => makeRequestAuth("get", "/admin/returns/list", null, { params }),
  getKPIs: () => makeRequestAuth("get", "/admin/returns/kpis"),
  getReturnDetail: (id) => makeRequestAuth("get", `/admin/returns/detail/${id}`),
  createReturn: (data) => makeRequestAuth("post", "/admin/returns/create", data),
  approveReturn: (id, data) => makeRequestAuth("post", `/admin/returns/${id}/approve`, data),
  inspectReturn: (id, data) => makeRequestAuth("post", `/admin/returns/${id}/inspect`, data),
  issueCreditNote: (id, data) => makeRequestAuth("post", `/admin/returns/${id}/credit-note`, data),
};

