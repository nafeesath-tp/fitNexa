import api from '../../api/axios';


export const authApi = {
    login: async (credentials) => {
        const response = await api.post('/api/auth/login/', credentials);
        return response.data;
    },

    signup: async (data) => {
        const response = await api.post('/api/auth/signup/', data);
        return response.data;
    },

    googleAuth: async (data) => {
        const response = await api.post('/api/auth/google-auth/', data);
        return response.data;
    },

    googleSignup: async (data) => {
        const response = await api.post('/api/auth/google-signup/', data);
        return response.data;
    },

    logout: async () => {
        const response = await api.post('/api/auth/logout/');
        return response.data;
    },

    checkAuth: async () => {
        const response = await api.get(`/api/auth/me/?t=${Date.now()}`);
        return response.data;
    },

    me: async () => {
        const response = await api.get(`/api/auth/me/?t=${Date.now()}`);
        return response.data;
    },

    forgotPassword: async (data) => {
        const response = await api.post('/api/auth/forgot-password/', data);
        return response.data;
    },

    verifyResetOtp: async (data) => {
        const response = await api.post('/api/auth/verify-reset-otp/', data);
        return response.data;
    },

    resetPassword: async (data) => {
        const response = await api.post('/api/auth/reset-password/', data);
        return response.data;
    }
};
