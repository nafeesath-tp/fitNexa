import axiosInstance from '../../api/axios';

export const trainerApi = {
    // Submit onboarding (FormData for files)
    submitOnboarding: async (formData) => {
        // Axios 1.x postForm automatically handles the FormData boundary and headers
        const response = await axiosInstance.postForm('/api/trainer/onboarding/', formData);
        return response.data;
    },

    // Get trainer profile
    getProfile: async () => {
        const response = await axiosInstance.get('/api/trainer/profile/');
        return response.data;
    },
    
    // Get public specializations
    getSpecializations: async () => {
        const response = await axiosInstance.get('/api/public/specializations/');
        return response.data;
    }
};
