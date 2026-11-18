import { makeRequestAuth, uploadImageApi } from "@/config/apiClient";

export const mediaApi = {
  getMediaList: (params = {}) => makeRequestAuth("get", "/admin/media/list", params),
  getMediaDetail: (id) => makeRequestAuth("get", `/admin/media/detail/${id}`),
  createMedia: (data) => makeRequestAuth("post", "/admin/media/create", data),
  updateMedia: (id, data) => makeRequestAuth("put", `/admin/media/update/${id}`, data),
  deleteMedia: (id) => makeRequestAuth("delete", `/admin/media/delete/${id}`),
  uploadImage: (file) => uploadImageApi(file),
};
