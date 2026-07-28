import api from "../api/axios";

export const workoutApi = {
  // ── Trainer: Plan Templates ─────────────────────────────────────────────
  getTrainerPlans: async () => {
    const res = await api.get("/api/workouts/trainer/plans/");
    return res.data;
  },

  createPlan: async (data) => {
    const res = await api.post("/api/workouts/trainer/plans/", data);
    return res.data;
  },

  getPlanDetail: async (planId) => {
    const res = await api.get(`/api/workouts/trainer/plans/${planId}/`);
    return res.data;
  },

  updatePlan: async (planId, data) => {
    const res = await api.patch(`/api/workouts/trainer/plans/${planId}/`, data);
    return res.data;
  },

  deletePlan: async (planId) => {
    const res = await api.delete(`/api/workouts/trainer/plans/${planId}/`);
    return res.data;
  },

  // ── Trainer: Builder ────────────────────────────────────────────────────
  addWeek: async (planId, data) => {
    const res = await api.post(`/api/workouts/trainer/plans/${planId}/weeks/`, data);
    return res.data;
  },

  addDay: async (planId, weekId, data) => {
    const res = await api.post(`/api/workouts/trainer/plans/${planId}/weeks/${weekId}/days/`, data);
    return res.data;
  },

  addExercise: async (planId, dayId, data) => {
    const res = await api.post(`/api/workouts/trainer/plans/${planId}/days/${dayId}/exercises/`, data);
    return res.data;
  },

  deleteExercise: async (planId, exerciseId) => {
    const res = await api.delete(`/api/workouts/trainer/plans/${planId}/exercises/${exerciseId}/`);
    return res.data;
  },

  // ── Trainer: Assignment ─────────────────────────────────────────────────
  assignPlan: async (planId, trainerAssignmentId) => {
    const res = await api.post(`/api/workouts/trainer/plans/${planId}/assign/`, {
      trainer_assignment_id: trainerAssignmentId,
    });
    return res.data;
  },

  getTrainerAssignments: async () => {
    const res = await api.get("/api/workouts/trainer/assignments/");
    return res.data;
  },

  // ── Client: View & Track ────────────────────────────────────────────────
  getClientCurrentWorkout: async () => {
    const res = await api.get("/api/workouts/client/current/");
    return res.data;
  },

  completeDay: async (dayId, notes = "") => {
    const res = await api.post(`/api/workouts/client/complete-day/${dayId}/`, { notes });
    return res.data;
  },

  getClientProgress: async () => {
    const res = await api.get("/api/workouts/client/progress/");
    return res.data;
  },
};
