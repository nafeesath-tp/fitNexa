import api from '../api/axios';

export const aiPlansApi = {
  // === Client Endpoints ===

  /**
   * Submit AI questionnaire to generate a plan
   */
  generatePlan: async (data) => {
    const response = await api.post('/api/ai-plans/generate/', data);
    return response.data;
  },

  /**
   * Get all AI plan requests for the logged-in client
   */
  getMyPlans: async () => {
    const response = await api.get('/api/ai-plans/my-plans/');
    return response.data;
  },

  /**
   * Get specific AI plan detail for the logged-in client
   */
  getPlanDetail: async (id) => {
    const response = await api.get(`/api/ai-plans/my-plans/${id}/`);
    return response.data;
  },

  // === Trainer Endpoints ===

  /**
   * Get all pending AI plans assigned to the trainer for review
   */
  getPendingPlans: async () => {
    const response = await api.get('/api/ai-plans/trainer/pending/');
    return response.data;
  },

  /**
   * Get all AI plans handled by the trainer (all statuses)
   */
  getAllTrainerPlans: async () => {
    const response = await api.get('/api/ai-plans/trainer/all/');
    return response.data;
  },

  /**
   * Get specific AI plan detail for trainer review
   */
  getTrainerPlanDetail: async (id) => {
    const response = await api.get(`/api/ai-plans/trainer/${id}/`);
    return response.data;
  },

  /**
   * Approve an AI plan and assign it to the client
   */
  approvePlan: async (id) => {
    const response = await api.post(`/api/ai-plans/trainer/${id}/approve/`);
    return response.data;
  },

  /**
   * Reject an AI plan and request regeneration
   */
  regeneratePlan: async (id) => {
    const response = await api.post(`/api/ai-plans/trainer/${id}/regenerate/`);
    return response.data;
  },

  /**
   * Request next week's plan generation based on progress
   */
  generateNextWeek: async (id, feedbackData = {}) => {
    const response = await api.post(`/api/ai-plans/trainer/${id}/next-week/`, feedbackData);
    return response.data;
  }
};
