import api from '../api/axios';

export const schedulingApi = {
  // Settings
  getSettings: async () => {
    const res = await api.get('/api/scheduling/trainer/settings/');
    return res.data;
  },
  updateSettings: async (data) => {
    const res = await api.put('/api/scheduling/trainer/settings/', data);
    return res.data;
  },

  // Availability
  getAvailability: async () => {
    const res = await api.get('/api/scheduling/trainer/availability/');
    return res.data;
  },
  createAvailability: async (data) => {
    const res = await api.post('/api/scheduling/trainer/availability/', data);
    return res.data;
  },
  deleteAvailability: async (id) => {
    const res = await api.delete(`/api/scheduling/trainer/availability/${id}/`);
    return res.data;
  },

  // Blocked Dates
  getBlockedDates: async () => {
    const res = await api.get('/api/scheduling/trainer/blocked-dates/');
    return res.data;
  },
  createBlockedDate: async (data) => {
    const res = await api.post('/api/scheduling/trainer/blocked-dates/', data);
    return res.data;
  },
  deleteBlockedDate: async (id) => {
    const res = await api.delete(`/api/scheduling/trainer/blocked-dates/${id}/`);
    return res.data;
  },

  // Slots
  getSlots: async (startDate = null, endDate = null) => {
    let params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const res = await api.get('/api/scheduling/trainer/slots/', { params });
    return res.data;
  },
  generateSlots: async (data) => {
    const res = await api.post('/api/scheduling/trainer/generate-slots/', data);
    return res.data;
  },
  blockSlot: async (id) => {
    const res = await api.patch(`/api/scheduling/trainer/slots/${id}/block/`);
    return res.data;
  },
  unblockSlot: async (id) => {
    const res = await api.patch(`/api/scheduling/trainer/slots/${id}/unblock/`);
    return res.data;
  },

  // ── Client Booking Endpoints ──
  getClientTrainers: async () => {
    const res = await api.get('/api/scheduling/client/trainers/');
    return res.data;
  },
  getAvailableSlots: async (trainerId, startDate, endDate) => {
    let params = { trainer_id: trainerId };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const res = await api.get('/api/scheduling/client/slots/', { params });
    return res.data;
  },
  bookSession: async (slotId, notes = '') => {
    const res = await api.post('/api/scheduling/client/book/', { slot_id: slotId, notes });
    return res.data;
  },
  getClientSessions: async () => {
    const res = await api.get('/api/scheduling/client/sessions/');
    return res.data;
  },
  rescheduleSession: async (sessionId, newSlotId) => {
    const res = await api.patch(`/api/scheduling/client/sessions/${sessionId}/reschedule/`, { new_slot_id: newSlotId });
    return res.data;
  },
  cancelSession: async (sessionId) => {
    const res = await api.patch(`/api/scheduling/client/sessions/${sessionId}/cancel/`);
    return res.data;
  },

  // ── Trainer Session Endpoints ──
  getTrainerSessions: async (filters = {}) => {
    const res = await api.get('/api/scheduling/trainer/sessions/', { params: filters });
    return res.data;
  },
  completeSession: async (sessionId) => {
    const res = await api.patch(`/api/scheduling/trainer/sessions/${sessionId}/complete/`);
    return res.data;
  }
};
