import api from "../api/axios";

export const paymentsApi = {
  // ── Trainer Endpoints ───────────────────────────────────────────────────────
  getTrainerDashboard: async () => {
    const res = await api.get("/api/payments/trainer/dashboard/");
    return res.data;
  },

  getTrainerEarnings: async (params = {}) => {
    const res = await api.get("/api/payments/trainer/earnings/", { params });
    return res.data;
  },

  getTrainerWallet: async () => {
    const res = await api.get("/api/payments/trainer/wallet/");
    return res.data;
  },

  getTrainerPayouts: async () => {
    const res = await api.get("/api/payments/trainer/payouts/");
    return res.data;
  },

  requestPayout: async (amount) => {
    const res = await api.post("/api/payments/trainer/payouts/request/", { amount });
    return res.data;
  },

  // ── Admin Endpoints ─────────────────────────────────────────────────────────
  getAdminAnalytics: async (params = {}) => {
    const res = await api.get("/api/payments/admin/analytics/", { params });
    return res.data;
  },

  getAdminPayouts: async (params = {}) => {
    const res = await api.get("/api/payments/admin/payouts/", { params });
    return res.data;
  },

  processPayout: async (payoutId, adminNotes = "") => {
    const res = await api.post(`/api/payments/admin/payouts/${payoutId}/process/`, { admin_notes: adminNotes });
    return res.data;
  },

  confirmPayout: async (payoutId, paymentReference, adminNotes = "") => {
    const res = await api.post(`/api/payments/admin/payouts/${payoutId}/confirm/`, {
      payment_reference: paymentReference,
      admin_notes: adminNotes,
    });
    return res.data;
  },

  rejectPayout: async (payoutId, failureReason, adminNotes = "") => {
    const res = await api.post(`/api/payments/admin/payouts/${payoutId}/reject/`, {
      failure_reason: failureReason,
      admin_notes: adminNotes,
    });
    return res.data;
  },

  failPayout: async (payoutId, failureReason, adminNotes = "") => {
    const res = await api.post(`/api/payments/admin/payouts/${payoutId}/fail/`, {
      failure_reason: failureReason,
      admin_notes: adminNotes,
    });
    return res.data;
  },

  getAdminTransactions: async (params = {}) => {
    const res = await api.get("/api/payments/admin/transactions/", { params });
    return res.data;
  },

  getAdminEarnings: async (params = {}) => {
    const res = await api.get("/api/payments/admin/earnings/", { params });
    return res.data;
  },

  getAdminCreditLedgers: async (params = {}) => {
    const res = await api.get("/api/payments/admin/credit-ledgers/", { params });
    return res.data;
  },

  // ── Alternative Batch Transfers ────────────────────────────────────────────
  getAlternativeTransfers: async () => {
    const res = await api.get("/api/payments/batch-transfers/");
    return res.data;
  },

  requestAlternativeTransfer: async (data) => {
    const res = await api.post("/api/payments/batch-transfers/request/", data);
    return res.data;
  },
};

