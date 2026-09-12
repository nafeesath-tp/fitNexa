import api from '../api/axios';

export const groupWorkoutsApi = {
  // ── Trainer ──
  getTrainerWorkouts: async () => {
    const res = await api.get('/api/group-workouts/trainer/group-workouts/');
    return res.data;
  },
  createWorkout: async (data) => {
    const res = await api.post('/api/group-workouts/trainer/group-workouts/', data);
    return res.data;
  },
  updateWorkout: async (id, data) => {
    const res = await api.patch(`/api/group-workouts/trainer/group-workouts/${id}/`, data);
    return res.data;
  },
  deleteWorkout: async (id) => {
    await api.delete(`/api/group-workouts/trainer/group-workouts/${id}/`);
  },
  getWorkoutSessions: async (workoutId) => {
    const res = await api.get(`/api/group-workouts/trainer/group-workouts/${workoutId}/sessions/`);
    return res.data;
  },
  createSession: async (workoutId, data) => {
    const res = await api.post(`/api/group-workouts/trainer/group-workouts/${workoutId}/sessions/`, data);
    return res.data;
  },
  getSessionParticipants: async (sessionId) => {
    const res = await api.get(`/api/group-workouts/trainer/sessions/${sessionId}/participants/`);
    return res.data;
  },
  completeSession: async (sessionId) => {
    const res = await api.patch(`/api/group-workouts/trainer/sessions/${sessionId}/complete/`);
    return res.data;
  },
  cancelSession: async (sessionId) => {
    const res = await api.patch(`/api/group-workouts/trainer/sessions/${sessionId}/cancel/`);
    return res.data;
  },

  // ── Client ──
  getClientWorkouts: async (filters = {}) => {
    const res = await api.get('/api/group-workouts/client/group-workouts/', { params: filters });
    return res.data;
  },
  getClientSessions: async (filters = {}) => {
    const res = await api.get('/api/group-workouts/client/sessions/', { params: filters });
    return res.data;
  },
  joinSession: async (sessionId) => {
    const res = await api.post(`/api/group-workouts/client/sessions/${sessionId}/join/`);
    return res.data;
  },
  leaveSession: async (sessionId) => {
    const res = await api.post(`/api/group-workouts/client/sessions/${sessionId}/leave/`);
    return res.data;
  },
  getMyGroupSessions: async () => {
    const res = await api.get('/api/group-workouts/client/my-sessions/');
    return res.data;
  },

  // ── Admin ──
  adminGetWorkouts: async () => {
    const res = await api.get('/api/group-workouts/admin/group-workouts/');
    return res.data;
  },
  adminGetSessionReports: async () => {
    const res = await api.get('/api/group-workouts/admin/session-reports/');
    return res.data;
  },
};
