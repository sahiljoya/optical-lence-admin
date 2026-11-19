import { makeRequestAuth } from "@/config/apiClient";

export const supportService = {
  getTickets: (params = {}) => makeRequestAuth("get", "/admin/support/tickets", params),
  getTicketDetail: (id) => makeRequestAuth("get", `/admin/support/tickets/${id}`),
  sendReply: (id, text) => makeRequestAuth("post", `/admin/support/tickets/${id}/messages`, { text }),
  updateStatus: (id, status) => makeRequestAuth("post", `/admin/support/tickets/${id}/status`, { status }),
  createTicket: (data) => makeRequestAuth("post", "/admin/support/tickets", data),
};
