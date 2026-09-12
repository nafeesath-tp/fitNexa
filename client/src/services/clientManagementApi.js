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

  // ── Trainer: Groups (Batches) ─────────────────────────────────────────────
  getTrainerGroups: async () => {
    const res = await api.get("/api/client-management/trainer/groups/");
    return res.data;
  },

  createTrainerGroup: async (data) => {
    const res = await api.post("/api/client-management/trainer/groups/", data);
    return res.data;
  },

  getTrainerGroupDetail: async (groupId) => {
    const res = await api.get(`/api/client-management/trainer/groups/${groupId}/`);
    return res.data;
  },

  updateTrainerGroup: async (groupId, data) => {
    const res = await api.patch(`/api/client-management/trainer/groups/${groupId}/`, data);
    return res.data;
  },

  deleteTrainerGroup: async (groupId) => {
    const res = await api.delete(`/api/client-management/trainer/groups/${groupId}/`);
    return res.data;
  },

  addGroupMember: async (groupId, data) => {
    const res = await api.post(`/api/client-management/trainer/groups/${groupId}/members/`, data);
    return res.data;
  },

  removeGroupMember: async (groupId, taId) => {
    const res = await api.delete(`/api/client-management/trainer/groups/${groupId}/members/${taId}/`);
    return res.data;
  },

  getEligibleGroupClients: async (groupId) => {
    const res = await api.get(`/api/client-management/trainer/groups/${groupId}/eligible-clients/`);
    return res.data;
  },

  assignWorkoutToGroup: async (groupId, data) => {
    const res = await api.post(`/api/client-management/trainer/groups/${groupId}/assign-workout/`, data);
    return res.data;
  },

  assignDietToGroup: async (groupId, data) => {
    const res = await api.post(`/api/client-management/trainer/groups/${groupId}/assign-diet/`, data);
    return res.data;
  },

  // ── Client Endpoints ──────────────────────────────────────────────────────
  getMyAssignedTrainer: async () => {
    const res = await api.get("/api/client-management/client/trainer/");
    return res.data;
  },
};
