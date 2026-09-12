import api from '../api/axios';

export const subscriptionApi = {
  // ── Public ────────────────────────────────────────────────────────────────
  /** GET /api/subscriptions/plans/ — list active plans (no auth needed) */
  getPlans: async () => {
    const res = await api.get('/api/subscriptions/plans/');
    return res.data;
  },

  // ── Client ────────────────────────────────────────────────────────────────
  /** POST /api/subscriptions/client/create-stripe-session/ */
  purchase: async ({ plan_id, billing_cycle, auto_renew = false }) => {
    const res = await api.post('/api/subscriptions/client/create-stripe-session/', {
      plan_id, billing_cycle, auto_renew,
    });
    return res.data;
  },

  /** POST /api/subscriptions/client/<id>/confirm/ — simulate Razorpay */
  confirmPayment: async (subscriptionId) => {
    const res = await api.post(`/api/subscriptions/client/${subscriptionId}/confirm/`);
    return res.data;
  },

  /** GET /api/subscriptions/client/current/ */
  getCurrent: async () => {
    const res = await api.get('/api/subscriptions/client/current/');
    return res.data;
  },

  /** GET /api/subscriptions/client/history/ */
  getHistory: async () => {
    const res = await api.get('/api/subscriptions/client/history/');
    return res.data;
  },

  // ── Admin ─────────────────────────────────────────────────────────────────
  /** GET /api/subscriptions/admin/plans/ — all plans including inactive */
  adminGetPlans: async () => {
    const res = await api.get('/api/subscriptions/admin/plans/');
    return res.data;
  },

  /** POST /api/subscriptions/admin/plans/ */
  adminCreatePlan: async (data) => {
    const res = await api.post('/api/subscriptions/admin/plans/', data);
    return res.data;
  },

  /** PATCH /api/subscriptions/admin/plans/<id>/ */
  adminUpdatePlan: async (id, data) => {
    const res = await api.patch(`/api/subscriptions/admin/plans/${id}/`, data);
    return res.data;
  },

  /** DELETE /api/subscriptions/admin/plans/<id>/ — soft deactivate */
  adminDeactivatePlan: async (id) => {
    const res = await api.delete(`/api/subscriptions/admin/plans/${id}/`);
    return res.data;
  },

  /** GET /api/subscriptions/admin/subscriptions/ */
  adminGetAllSubscriptions: async () => {
    const res = await api.get('/api/subscriptions/admin/subscriptions/');
    return res.data;
  },
};
