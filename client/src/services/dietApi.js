import api from "../api/axios";

export const dietApi = {
  // ── Trainer: Plan Templates ─────────────────────────────────────────────
  getTrainerPlans: async () => {
    const res = await api.get("/api/diets/trainer/plans/");
    return res.data;
  },

  createPlan: async (data) => {
    const res = await api.post("/api/diets/trainer/plans/", data);
    return res.data;
  },

  getPlanDetail: async (planId) => {
    const res = await api.get(`/api/diets/trainer/plans/${planId}/`);
    return res.data;
  },

  updatePlan: async (planId, data) => {
    const res = await api.patch(`/api/diets/trainer/plans/${planId}/`, data);
    return res.data;
  },

  deletePlan: async (planId) => {
    const res = await api.delete(`/api/diets/trainer/plans/${planId}/`);
    return res.data;
  },

  // ── Trainer: Builder ────────────────────────────────────────────────────
  addWeek: async (planId, data) => {
    const res = await api.post(`/api/diets/trainer/plans/${planId}/weeks/`, data);
    return res.data;
  },

  deleteWeek: async (planId, weekId) => {
    const res = await api.delete(`/api/diets/trainer/plans/${planId}/weeks/${weekId}/`);
    return res.data;
  },

  addDay: async (planId, weekId, data) => {
    const res = await api.post(`/api/diets/trainer/plans/${planId}/weeks/${weekId}/days/`, data);
    return res.data;
  },

  deleteDay: async (planId, dayId) => {
    const res = await api.delete(`/api/diets/trainer/plans/${planId}/days/${dayId}/`);
    return res.data;
  },

  addMeal: async (planId, dayId, data) => {
    const res = await api.post(`/api/diets/trainer/plans/${planId}/days/${dayId}/meals/`, data);
    return res.data;
  },

  updateMeal: async (planId, mealId, data) => {
    const res = await api.patch(`/api/diets/trainer/plans/${planId}/meals/${mealId}/`, data);
    return res.data;
  },

  deleteMeal: async (planId, mealId) => {
    const res = await api.delete(`/api/diets/trainer/plans/${planId}/meals/${mealId}/`);
    return res.data;
  },

  // ── Trainer: Assignment ─────────────────────────────────────────────────
  assignPlan: async (planId, trainerAssignmentId) => {
    const res = await api.post(`/api/diets/trainer/plans/${planId}/assign/`, {
      trainer_assignment_id: trainerAssignmentId,
    });
    return res.data;
  },

  getTrainerAssignments: async () => {
    const res = await api.get("/api/diets/trainer/assignments/");
    return res.data;
  },

  // ── Client: View & Track ────────────────────────────────────────────────
  getClientCurrentDiet: async () => {
    const res = await api.get("/api/diets/client/current/");
    return res.data;
  },

  completeMeal: async (mealId, notes = "") => {
    const res = await api.post(`/api/diets/client/complete-meal/${mealId}/`, { notes });
    return res.data;
  },

  getClientProgress: async () => {
    const res = await api.get("/api/diets/client/progress/");
    return res.data;
  },
};
