import { create } from "zustand";

export const useWorkoutStore = create((set) => ({
  // Trainer state
  trainerPlans: [],
  activePlan: null,

  // Client state
  currentWorkout: null,
  progress: null,

  // Actions
  setTrainerPlans: (trainerPlans) => set({ trainerPlans }),
  addTrainerPlan: (plan) =>
    set((state) => ({ trainerPlans: [plan, ...state.trainerPlans] })),
  removeTrainerPlan: (planId) =>
    set((state) => ({
      trainerPlans: state.trainerPlans.filter((p) => p.id !== planId),
    })),
  setActivePlan: (activePlan) => set({ activePlan }),

  setCurrentWorkout: (currentWorkout) => set({ currentWorkout }),
  setProgress: (progress) => set({ progress }),

  markDayComplete: (dayId) =>
    set((state) => {
      if (!state.currentWorkout) return {};
      const completed_day_ids = [...(state.currentWorkout.completed_day_ids || []), dayId];
      const total = state.currentWorkout.total_days;
      const completed = completed_day_ids.length;
      return {
        currentWorkout: {
          ...state.currentWorkout,
          completed_days: completed,
          completed_day_ids,
          progress_pct: total > 0 ? Math.round((completed / total) * 100) : 0,
        },
      };
    }),

  clearWorkoutState: () =>
    set({ trainerPlans: [], activePlan: null, currentWorkout: null, progress: null }),
}));
