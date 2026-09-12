import api from '../api/axios';

export const videoSessionsApi = {
    initSession: async (data) => {
        const response = await api.post('/video-sessions/init/', data);
        return response.data;
    },

    joinSession: async (sessionId) => {
        const response = await api.post(`/video-sessions/${sessionId}/join/`);
        return response.data;
    },

    startSession: async (sessionId) => {
        const response = await api.post(`/video-sessions/${sessionId}/start/`);
        return response.data;
    },

    endSession: async (sessionId) => {
        const response = await api.post(`/video-sessions/${sessionId}/end/`);
        return response.data;
    },

    getSessionDetails: async (sessionId) => {
        const response = await api.get(`/video-sessions/${sessionId}/`);
        return response.data;
    },

    // Admin endpoints
    getAdminAnalytics: async () => {
        const response = await api.get('/video-sessions/admin/analytics/');
        return response.data;
    },

    getAdminLogs: async (params) => {
        const response = await api.get('/video-sessions/admin/logs/', { params });
        return response.data;
    }
};
