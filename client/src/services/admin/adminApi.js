import axiosInstance from '../../api/axios';

export const adminApi = {
    // --- Specializations ---
    getSpecializations: async () => {
        const response = await axiosInstance.get('/admin/specializations/');
        return response.data;
    },
    createSpecialization: async (data) => {
        const response = await axiosInstance.post('/admin/specializations/', data);
        return response.data;
    },
    updateSpecialization: async (id, data) => {
        const response = await axiosInstance.put(`/admin/specializations/${id}/`, data);
        return response.data;
    },
    deleteSpecialization: async (id) => {
        const response = await axiosInstance.delete(`/admin/specializations/${id}/`);
        return response.data;
    },

    // --- Trainers ---
    getTrainers: async () => {
        const response = await axiosInstance.get('/admin/trainers/');
        return response.data; // Expected { success, data: [] }
    },
    getTrainerDetails: async (id) => {
        const response = await axiosInstance.get(`/admin/trainers/${id}/`);
        return response.data;
    },
    updateTrainerStatus: async (id, statusData) => {
        // statusData should be { approval_status: 'APPROVED' | 'REJECTED' }
        const response = await axiosInstance.patch(`/admin/trainers/${id}/status/`, statusData);
        return response.data;
    },

    // --- Clients ---
    getClients: async () => {
        const response = await axiosInstance.get('/admin/clients/');
        return response.data;
    },
    getClientDetails: async (id) => {
        const response = await axiosInstance.get(`/admin/clients/${id}/`);
        return response.data;
    }
};
