import api from "../api/axios";

export const contentApi = {
  // ── Client Endpoints ──────────────────────────────────────────────────────
  /**
   * GET /api/content/client/videos/
   * Supports query params: specialization, difficulty, access_level, search
   */
  getClientVideos: async (params = {}) => {
    const res = await api.get("/api/content/client/videos/", { params });
    return res.data;
  },

  /**
   * GET /api/content/client/videos/<id>/
   */
  getClientVideoDetail: async (videoId) => {
    const res = await api.get(`/api/content/client/videos/${videoId}/`);
    return res.data;
  },

  // ── Admin Endpoints ───────────────────────────────────────────────────────
  /**
   * GET /api/content/admin/videos/
   */
  getAdminVideos: async (params = {}) => {
    const res = await api.get("/api/content/admin/videos/", { params });
    return res.data;
  },

  /**
   * POST /api/content/admin/videos/
   */
  createAdminVideo: async (data) => {
    const res = await api.post("/api/content/admin/videos/", data);
    return res.data;
  },

  /**
   * PATCH /api/content/admin/videos/<id>/
   */
  updateAdminVideo: async (videoId, data) => {
    const res = await api.patch(`/api/content/admin/videos/${videoId}/`, data);
    return res.data;
  },

  /**
   * DELETE /api/content/admin/videos/<id>/
   */
  deleteAdminVideo: async (videoId) => {
    const res = await api.delete(`/api/content/admin/videos/${videoId}/`);
    return res.data;
  },
};
