import { create } from "zustand";

const INITIAL_FILTERS = {
  specialization: "all",
  difficulty: "ALL",
  access_level: "ALL",
  search: "",
};

export const useContentStore = create((set) => ({
  videos: [],
  adminVideos: [],
  filters: { ...INITIAL_FILTERS },

  setVideos: (videos) => set({ videos }),
  setAdminVideos: (adminVideos) => set({ adminVideos }),
  
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),

  resetFilters: () => set({ filters: { ...INITIAL_FILTERS } }),

  upsertAdminVideo: (video) =>
    set((state) => {
      const exists = state.adminVideos.some((v) => v.id === video.id);
      const newAdminVideos = exists
        ? state.adminVideos.map((v) => (v.id === video.id ? video : v))
        : [video, ...state.adminVideos];
      return { adminVideos: newAdminVideos };
    }),

  removeAdminVideo: (videoId) =>
    set((state) => ({
      adminVideos: state.adminVideos.filter((v) => v.id !== videoId),
    })),
}));
