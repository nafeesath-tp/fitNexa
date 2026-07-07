import { create } from 'zustand';

export const useAuthStore = create((set) => ({
    user: null,           // contains email, role, etc.
    role: null,           // CLIENT, TRAINER, ADMIN
    approval_status: null, // Specific for trainers
    isAuthenticated: false,
    isLoading: true,      // True by default to handle initial app load

    // Actions
    setAuth: (userData) => set({
        user: userData,
        role: userData?.role || null,
        approval_status: userData?.approval_status || null,
        isAuthenticated: !!userData,
        isLoading: false
    }),

    clearAuth: () => set({
        user: null,
        role: null,
        approval_status: null,
        isAuthenticated: false,
        isLoading: false
    }),
    
    setLoading: (isLoading) => set({ isLoading }),
}));
