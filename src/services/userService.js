import { makeRequestAuth } from "@/config/apiClient";

export const userService = {
  getEmployees: (params = {}) => makeRequestAuth("post", "/admin/employee/list", params),

  createEmployee: (data) => makeRequestAuth("post", "/admin/employee/create", data),

  updateEmployee: (data) => makeRequestAuth("post", "/admin/employee/update", data),

  getRoles: () => makeRequestAuth("post", "/admin/role/list", {}),

  createRole: (data) => makeRequestAuth("post", "/admin/role/create", data),

  updateRole: (data) => makeRequestAuth("post", "/admin/role/update", data),

  deleteRole: (role_id) => makeRequestAuth("post", "/admin/role/delete", { role_id }),

  getPermissions: () => makeRequestAuth("get", "/admin/role/permissions"),
};
