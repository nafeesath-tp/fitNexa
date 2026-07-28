import { create } from "zustand";

export const useDietStore = create((set) => ({
  // Trainer state
  trainerPlans: [],
  activePlan: null,

  // Client state
  currentDiet: null,
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

  setCurrentDiet: (currentDiet) => set({ currentDiet }),
  setProgress: (progress) => set({ progress }),

  markMealComplete: (mealId) =>
    set((state) => {
      if (!state.currentDiet) return {};
      const completed_meal_ids = [...(state.currentDiet.completed_meal_ids || []), mealId];
      const total = state.currentDiet.total_meals || 0;
      const completed = completed_meal_ids.length;
      return {
        currentDiet: {
          ...state.currentDiet,
          completed_meals: completed,
          completed_meal_ids,
          progress_pct: total > 0 ? Math.round((completed / total) * 100) : 0,
          progress_text: `${completed} / ${total}`,
        },
      };
    }),

  clearDietState: () =>
    set({ trainerPlans: [], activePlan: null, currentDiet: null, progress: null }),
}));
