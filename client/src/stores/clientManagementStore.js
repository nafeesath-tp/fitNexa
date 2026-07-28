import { create } from "zustand";

export const useClientManagementStore = create((set) => ({
  adminAssignments: [],
  myClients: [],

  setAdminAssignments: (adminAssignments) => set({ adminAssignments }),
  setMyClients: (myClients) => set({ myClients }),

  updateClientAssignment: (clientId, trainerInfo) =>
    set((state) => ({
      adminAssignments: state.adminAssignments.map((client) => {
        if (client.id === clientId) {
          return {
            ...client,
            is_assigned: true,
            assigned_trainer: trainerInfo,
          };
        }
        return client;
      }),
    })),
}));
