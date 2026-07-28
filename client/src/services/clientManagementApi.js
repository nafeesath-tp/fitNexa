import api from "../api/axios";

export const clientManagementApi = {
  // ── Admin Assignment Endpoints ────────────────────────────────────────────
  getAdminClientAssignments: async (params = {}) => {
    const res = await api.get("/api/client-management/admin/assignments/", { params });
    return res.data;
  },

  assignTrainer: async (data) => {
    const res = await api.post("/api/client-management/admin/assign/", data);
    return res.data;
  },

  reassignTrainer: async (clientId, data) => {
    const res = await api.patch(`/api/client-management/admin/reassign/${clientId}/`, data);
    return res.data;
  },

  // ── Trainer Endpoints ─────────────────────────────────────────────────────
  getTrainerMyClients: async () => {
    const res = await api.get("/api/client-management/trainer/my-clients/");
    return res.data;
  },

  getTrainerClientDetail: async (clientId) => {
    const res = await api.get(`/api/client-management/trainer/my-clients/${clientId}/`);
    return res.data;
  },

  // ── Client Endpoints ──────────────────────────────────────────────────────
  getMyAssignedTrainer: async () => {
    const res = await api.get("/api/client-management/client/trainer/");
    return res.data;
  },
};
