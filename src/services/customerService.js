import { makeRequestAuth } from "@/config/apiClient";

export const customerService = {
  getCustomers: (params = {}) => makeRequestAuth("post", "/admin/customer/list", params),

  getCustomerById: (id) => makeRequestAuth("get", `/admin/customer/detail/${id}`),

  getPendingCustomers: (params = {}) => makeRequestAuth("post", "/admin/customer/pending-list", params),

  getReviewQueue: () => makeRequestAuth("get", "/admin/dashboard/approvals-queue"),

  createCustomer: (data) => makeRequestAuth("post", "/admin/customer/direct-onboard", data),

  generateInvite: (data) => makeRequestAuth("post", "/admin/customer/generate-invite", data),

  approveAccounts: (data) => makeRequestAuth("post", "/admin/customer/approve-accounts", data),

  approveOwner: (customerId) => makeRequestAuth("post", "/admin/customer/approve-owner", { customerId }),

  rejectCustomer: (data) => makeRequestAuth("post", "/admin/customer/reject", data),

  toggleCustomerStatus: (customerId, is_active) =>
    makeRequestAuth("post", "/admin/customer/toggle-status", { customerId, is_active }),

  updateCustomerProfile: (customerId, data) =>
    makeRequestAuth("post", "/admin/customer/update-profile", { customerId, ...data }),

  updateCustomerGstRate: (customerId, negotiated_gst_rate) =>
    makeRequestAuth("post", "/admin/customer/update-gst-rate", { customerId, negotiated_gst_rate }),

  updateAccountStatus: (customerId, account_status) =>
    makeRequestAuth("post", "/admin/customer/update-account-status", { customerId, account_status }),

  resetDevice: (customerId, platform) => makeRequestAuth("post", "/admin/customer/reset-device", { customerId, platform }),

  requestLimitIncrease: (customerId, requestedAmount, reason) =>
    makeRequestAuth("post", "/admin/customer/limit/request", { customerId, requestedAmount, reason }),

  getLimitIncreaseQueue: () => makeRequestAuth("get", "/admin/customer/limit/queue"),

  actionLimitIncrease: (data) => makeRequestAuth("post", "/admin/customer/limit/action", data),

  createSubCustomer: (parentCustomerId, data) =>
    makeRequestAuth("post", "/admin/customer/create-subcustomer", { parentCustomerId, ...data }),

  updateSubCustomer: (subCustomerId, data) =>
    makeRequestAuth("post", "/admin/customer/update-subcustomer", { subCustomerId, ...data }),

  updateSubCustomerPermissions: (subCustomerId, permissions) =>
    makeRequestAuth("post", "/admin/customer/update-subcustomer-permissions", { subCustomerId, permissions }),

  getSubCustomers: (parentCustomerId) =>
    makeRequestAuth("post", "/admin/customer/list-subcustomers", { parentCustomerId }),

  getCustomerLedger: (customerId, filters = {}) =>
    makeRequestAuth("get", `/admin/ledger/${customerId}`, filters),

  getRecentOrders: (customerId) => makeRequestAuth("get", `/admin/customer/${customerId}/orders`),

  getOrderVolume: (customerId) => makeRequestAuth("get", `/admin/customer/${customerId}/order-volume`),

  getCart: (customerId) => makeRequestAuth("get", `/admin/customer/${customerId}/cart`),
  getCustomerNegotiatedPrices: (customerId) => makeRequestAuth("get", `/admin/customer/${customerId}/negotiated-prices`),
  setNegotiatedPrice: (customerId, productId, negotiatedPrice) => makeRequestAuth("post", "/admin/product/set-negotiated-price", { customerId, productId, negotiatedPrice }),
  deleteNegotiatedPrice: (customerId, productId) => makeRequestAuth("post", "/admin/product/delete-negotiated-price", { customerId, productId }),

  getCustomerLimitRequests: (customerId) => makeRequestAuth("get", `/admin/customer/${customerId}/limit-requests`),
  getCustomerDiscountRequests: (customerId) => makeRequestAuth("get", `/admin/customer/${customerId}/discount-requests`),
  getDiscountRequestsQueue: (params = {}) => makeRequestAuth("post", "/admin/discount-request/list", params),
  actionDiscountRequest: (data) => makeRequestAuth("post", "/admin/discount-request/action", data),

  getCustomerNotes: (customerId) => makeRequestAuth("get", `/admin/customer/${customerId}/notes`),
  createCustomerNote: (customerId, data) => makeRequestAuth("post", "/admin/customer/notes/create", { customerId, ...data }),
};
