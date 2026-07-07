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

    logout: async () => {
        const response = await api.post('/api/auth/logout/');
        return response.data;
    },

    checkAuth: async () => {
        const response = await api.get('/api/auth/me/');
        return response.data;
    }
};
