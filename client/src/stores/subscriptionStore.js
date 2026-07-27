import { create } from 'zustand';

export const useSubscriptionStore = create((set) => ({
  /** All active plans (for client plans page + admin management) */
  plans: [],

  /** Current ACTIVE subscription for the logged-in client */
  currentSubscription: null,

  /** Full subscription history for the logged-in client */
  history: [],

  /** Admin: all subscriptions across all clients */
  allSubscriptions: [],

  // ── Actions ──────────────────────────────────────────────────────────────
  setPlans:              (plans)             => set({ plans }),
  setCurrentSubscription:(sub)              => set({ currentSubscription: sub }),
  setHistory:            (history)          => set({ history }),
  setAllSubscriptions:   (allSubscriptions) => set({ allSubscriptions }),

  /** Called after purchase/confirm — merge updated sub into history */
  upsertHistoryItem: (updatedSub) =>
    set((state) => {
      const exists = state.history.some((s) => s.id === updatedSub.id);
      const newHistory = exists
        ? state.history.map((s) => (s.id === updatedSub.id ? updatedSub : s))
        : [updatedSub, ...state.history];
      return { history: newHistory };
    }),

  /** Called when admin creates/edits/deactivates a plan */
  upsertPlan: (updatedPlan) =>
    set((state) => {
      const exists = state.plans.some((p) => p.id === updatedPlan.id);
      const newPlans = exists
        ? state.plans.map((p) => (p.id === updatedPlan.id ? updatedPlan : p))
        : [...state.plans, updatedPlan];
      return { plans: newPlans };
    }),

  clearSubscriptionState: () =>
    set({ plans: [], currentSubscription: null, history: [], allSubscriptions: [] }),
}));
